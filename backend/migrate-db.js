const { Pool } = require('pg');

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTIONS
// ─────────────────────────────────────────────────────────────────────────────
const OLD_DB = 'postgresql://postgres.wkqcwjapitgtgysjjeab:KWTi2AnXH%25%2F-e68@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';
const NEW_DB = 'postgresql://postgres.ypqygmbdlebfmnodgzhr:0ThQAEsC8pHLZJbI@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

const oldPool = new Pool({ connectionString: OLD_DB, ssl: { rejectUnauthorized: false }, max: 3 });
const newPool = new Pool({ connectionString: NEW_DB, ssl: { rejectUnauthorized: false }, max: 3 });

// ─────────────────────────────────────────────────────────────────────────────
// TABLE CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const IOT_TABLES = ['Chambers', 'Devices', 'TelemetryLogs', 'Alerts', 'AlertSetting', 'OtaTasks', 'FirmwareVersion'];

// Enum types from old DB that need to be recreated in new DB
const ENUM_DEFS = {
  AdvanceSettledIn: ['FARMER', 'COLD_STORAGE'],
  BalanceType: ['DEBIT', 'CREDIT'],
  BardanaDirection: ['INWARD', 'OUTWARD', 'RETURN', 'PURCHASE'],
  BardanaEntryStatus: ['OPEN', 'PENDING', 'PARTIAL', 'COMPLETED'],
  BillingChargeType: ['RENT', 'LOADING', 'UNLOADING', 'BARDANA', 'COMMISSION', 'TRANSPORT', 'OTHER'],
  ColdStorageStatus: ['PENDING', 'APPROVED', 'REJECTED', 'DEACTIVATED'],
  DispatchStatus: ['CREATED', 'DISPATCHED', 'CANCELLED', 'IN_TRANSIT'],
  EmployeeStatus: ['ACTIVE', 'INACTIVE'],
  InventoryMovementType: ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'],
  LedgerAccountNature: ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'EQUITY', 'MEMO'],
  LedgerStatus: ['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'],
  LotStatus: ['STORED', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'CANCELLED'],
  NikasiMode: ['SALE_DISPATCH', 'FARMER_WITHDRAWAL'],
  NotificationChannel: ['SMS', 'EMAIL'],
  NotificationStatus: ['PENDING', 'SENT', 'FAILED'],
  PaymentDirection: ['INBOUND', 'OUTBOUND'],
  PaymentStatus: ['PENDING', 'PARTIAL', 'PAID', 'CANCELLED', 'INITIATED', 'APPROVED', 'REJECTED'],
  SaudaEntryStatus: ['OPEN', 'PARTIAL', 'SETTLED', 'CLOSED', 'CANCELLED'],
  SaudaSettlementStatus: ['PENDING', 'PARTIAL', 'READY_FOR_TRANSFER', 'CLOSED', 'CANCELLED'],
  SourceModule: ['AMAD', 'NIKASI', 'BARDANA', 'SAUDA', 'RECEIPT', 'PAYMENT', 'CONTRA', 'JOURNAL', 'MANUAL'],
  SupportRequestStatus: ['PENDING', 'RESOLVED'],
  UserRole: ['COMPANY_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'OPERATOR', 'STAFF'],
  VerificationChannel: ['SMS', 'EMAIL'],
  VerificationPurpose: ['LOGIN', 'REGISTRATION', 'FARMER_MOBILE_VERIFICATION', 'NIKASI_APPROVAL', 'SAUDA_APPROVAL', 'BARDANA_APPROVAL', 'PASSWORD_RESET'],
  VoucherType: ['AMAD_RENT', 'AMAD_LOADING', 'NIKASI_BILL', 'NIKASI_CASH', 'NIKASI_UNLOADING', 'BARDANA_ISSUE', 'BARDANA_PURCHASE', 'BARDANA_RETURN', 'BARDANA_TRANSFER', 'SAUDA_ADVANCE', 'RECEIPT', 'PAYMENT', 'CONTRA', 'JOURNAL'],
  account_status: ['ACTIVE', 'SUSPENDED'],
};

async function getColumns(pool, schema, tableName) {
  const res = await pool.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable,
           column_default, udt_name, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schema, tableName]);
  return res.rows;
}

async function getConstraints(pool, schema, tableName) {
  const res = await pool.query(`
    SELECT tc.constraint_type, tc.constraint_name,
           kcu.column_name, kcu.ordinal_position,
           ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name,
           rc.update_rule, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.table_schema = $1 AND tc.table_name = $2
    ORDER BY tc.constraint_type, kcu.ordinal_position
  `, [schema, tableName]);
  return res.rows;
}

async function getIndexes(pool, schema, tableName) {
  const res = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = $1 AND tablename = $2
    AND indexname NOT LIKE '%_pkey'
  `, [schema, tableName]);
  return res.rows;
}

function buildColType(col) {
  if (col.data_type === 'USER-DEFINED') {
    // It's an enum - use the udt_name directly (enums are created in public schema)
    return `"${col.udt_name}"`;
  }
  if (col.data_type === 'character varying') {
    return col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR';
  }
  if (col.data_type === 'numeric') {
    if (col.numeric_precision && col.numeric_scale != null) {
      return `NUMERIC(${col.numeric_precision}, ${col.numeric_scale})`;
    }
    return 'NUMERIC';
  }
  if (col.data_type === 'ARRAY') {
    const base = col.udt_name ? col.udt_name.replace(/^_/, '') : 'text';
    return `${base.toUpperCase()}[]`;
  }
  const mapping = {
    'integer': 'INTEGER',
    'bigint': 'BIGINT',
    'smallint': 'SMALLINT',
    'boolean': 'BOOLEAN',
    'text': 'TEXT',
    'json': 'JSON',
    'jsonb': 'JSONB',
    'uuid': 'UUID',
    'timestamp without time zone': 'TIMESTAMP',
    'timestamp with time zone': 'TIMESTAMPTZ',
    'double precision': 'DOUBLE PRECISION',
    'real': 'REAL',
    'date': 'DATE',
    'bytea': 'BYTEA',
  };
  return mapping[col.data_type] || col.data_type.toUpperCase();
}

async function createEnums(newPool) {
  console.log('🎭 Creating enum types in public schema...');
  for (const [enumName, values] of Object.entries(ENUM_DEFS)) {
    const vals = values.map(v => `'${v}'`).join(', ');
    try {
      await newPool.query(`CREATE TYPE "public"."${enumName}" AS ENUM (${vals})`);
      console.log(`  ✅ Created enum: ${enumName}`);
    } catch(e) {
      if (e.code === '42710') {
        console.log(`  ⏭️  Enum already exists: ${enumName}`);
      } else {
        console.warn(`  ⚠️  Enum ${enumName} failed: ${e.message}`);
      }
    }
  }
}

async function createTable(newPool, targetSchema, tableName, columns, constraints) {
  const colDefs = columns.map(col => {
    let def = `"${col.column_name}" ${buildColType(col)}`;
    if (col.is_nullable === 'NO') def += ' NOT NULL';
    if (col.column_default) {
      // strip schema references from sequences - they'll be auto-generated
      if (col.column_default.includes('nextval')) {
        // skip auto-increment defaults, let PG handle it via SERIAL or identity
        def += ` DEFAULT ${col.column_default}`;
      } else {
        def += ` DEFAULT ${col.column_default}`;
      }
    }
    return def;
  }).join(',\n  ');

  const pkCols = constraints
    .filter(c => c.constraint_type === 'PRIMARY KEY')
    .sort((a, b) => a.ordinal_position - b.ordinal_position)
    .map(c => `"${c.column_name}"`);

  let pkDef = '';
  if (pkCols.length > 0) {
    pkDef = `,\n  PRIMARY KEY (${pkCols.join(', ')})`;
  }

  const sql = `CREATE TABLE IF NOT EXISTS "${targetSchema}"."${tableName}" (\n  ${colDefs}${pkDef}\n);`;
  await newPool.query(sql);
}

async function addForeignKeys(newPool, targetSchema, tableName, constraints, tableSchemas) {
  const fks = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
  const grouped = {};
  for (const fk of fks) {
    if (!grouped[fk.constraint_name]) grouped[fk.constraint_name] = { cols: [], fk };
    grouped[fk.constraint_name].cols.push(fk.column_name);
  }

  for (const [cname, { cols, fk }] of Object.entries(grouped)) {
    const refTable = fk.foreign_table_name;
    const refSchema = tableSchemas[refTable] || 'admin';
    try {
      await newPool.query(`
        ALTER TABLE "${targetSchema}"."${tableName}"
        ADD CONSTRAINT "${cname}" FOREIGN KEY ("${cols.join('","')}")
        REFERENCES "${refSchema}"."${refTable}" ("${fk.foreign_column_name}")
        ON UPDATE ${fk.update_rule || 'NO ACTION'}
        ON DELETE ${fk.delete_rule || 'NO ACTION'}
      `);
    } catch(e) {
      if (e.code === '42710' || e.code === '42P07') {
        // Already exists
      } else {
        console.warn(`  ⚠️  FK ${cname} skipped: ${e.message}`);
      }
    }
  }
}

async function createIndexes(newPool, targetSchema, tableName, indexes) {
  for (const idx of indexes) {
    try {
      const newDef = idx.indexdef
        .replace(/ON public\."/, `ON "${targetSchema}"."`);
      await newPool.query(newDef);
    } catch(e) {
      if (e.code !== '42P07') { // ignore "already exists"
        console.warn(`  ⚠️  Index ${idx.indexname} skipped: ${e.message}`);
      }
    }
  }
}

async function copyData(oldPool, newPool, targetSchema, tableName, columns) {
  const countRes = await oldPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
  const total = parseInt(countRes.rows[0].count);
  
  if (total === 0) {
    console.log(`  ⏭️  No rows to copy`);
    return;
  }

  const rows = await oldPool.query(`SELECT * FROM "${tableName}"`);
  const colNames = columns.map(c => `"${c.column_name}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  
  let inserted = 0;
  let skipped = 0;
  for (const row of rows.rows) {
    const values = columns.map(c => row[c.column_name]);
    try {
      await newPool.query(
        `INSERT INTO "${targetSchema}"."${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
      inserted++;
    } catch(e) {
      skipped++;
      if (skipped <= 3) console.warn(`  ⚠️  Row skipped: ${e.message}`);
    }
  }
  console.log(`  ✅ Copied ${inserted}/${total} rows${skipped > 0 ? ` (${skipped} skipped)` : ''}`);
}

async function getPublicTables(pool) {
  const res = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return res.rows.map(r => r.table_name);
}

async function main() {
  try {
    // PHASE 0: Create enum types first
    await createEnums(newPool);

    console.log('\n📋 Fetching tables from old database...');
    const allTables = await getPublicTables(oldPool);
    
    const tableSchemas = {};
    for (const t of allTables) {
      tableSchemas[t] = IOT_TABLES.includes(t) ? 'iot' : 'admin';
    }
    
    console.log(`\n📊 Tables to migrate: ${allTables.length}`);
    console.log(`  → iot schema: ${Object.entries(tableSchemas).filter(([,v]) => v === 'iot').map(([k]) => k).join(', ') || 'none'}`);
    console.log(`  → admin schema: ${Object.entries(tableSchemas).filter(([,v]) => v === 'admin').map(([k]) => k).join(', ')}`);

    // PHASE 1: Create all table structures (no FKs)
    console.log('\n🔨 Phase 1: Creating table structures...');
    for (const [tableName, targetSchema] of Object.entries(tableSchemas)) {
      process.stdout.write(`  "${targetSchema}"."${tableName}"... `);
      try {
        const columns = await getColumns(oldPool, 'public', tableName);
        const constraints = await getConstraints(oldPool, 'public', tableName);
        await createTable(newPool, targetSchema, tableName, columns, constraints);
        console.log('✅');
      } catch(e) {
        console.log(`❌ ${e.message}`);
      }
    }

    // PHASE 2: Copy data
    console.log('\n📦 Phase 2: Copying data...');
    for (const [tableName, targetSchema] of Object.entries(tableSchemas)) {
      console.log(`  "${targetSchema}"."${tableName}":`);
      try {
        const columns = await getColumns(oldPool, 'public', tableName);
        await copyData(oldPool, newPool, targetSchema, tableName, columns);
      } catch(e) {
        console.log(`  ❌ ${e.message}`);
      }
    }

    // PHASE 3: Foreign keys
    console.log('\n🔗 Phase 3: Adding foreign keys...');
    for (const [tableName, targetSchema] of Object.entries(tableSchemas)) {
      try {
        const constraints = await getConstraints(oldPool, 'public', tableName);
        const fks = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
        if (fks.length > 0) {
          process.stdout.write(`  FK for "${tableName}"... `);
          await addForeignKeys(newPool, targetSchema, tableName, constraints, tableSchemas);
          console.log('✅');
        }
      } catch(e) {
        console.log(`  ❌ ${e.message}`);
      }
    }

    // PHASE 4: Indexes
    console.log('\n📇 Phase 4: Creating indexes...');
    for (const [tableName, targetSchema] of Object.entries(tableSchemas)) {
      try {
        const indexes = await getIndexes(oldPool, 'public', tableName);
        if (indexes.length > 0) {
          process.stdout.write(`  Indexes for "${tableName}"... `);
          await createIndexes(newPool, targetSchema, tableName, indexes);
          console.log('✅');
        }
      } catch(e) {
        console.log(`  ❌ ${e.message}`);
      }
    }

    // FINAL: Verify row counts
    console.log('\n🔍 Verification:');
    let allMatch = true;
    for (const [tableName, targetSchema] of Object.entries(tableSchemas)) {
      const oldCount = await oldPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
      let newCount = { rows: [{ count: '?' }] };
      try {
        newCount = await newPool.query(`SELECT COUNT(*) FROM "${targetSchema}"."${tableName}"`);
      } catch(e) {}
      const match = oldCount.rows[0].count === newCount.rows[0].count;
      if (!match) allMatch = false;
      const icon = match ? '✅' : '❌';
      console.log(`  ${icon} ${targetSchema}.${tableName}: old=${oldCount.rows[0].count}, new=${newCount.rows[0].count}`);
    }

    if (allMatch) {
      console.log('\n🎉 Migration completed successfully! All row counts match.');
    } else {
      console.log('\n⚠️  Migration completed with some discrepancies. Check above.');
    }

  } catch(err) {
    console.error('❌ Fatal error:', err);
  } finally {
    await oldPool.end();
    await newPool.end();
  }
}

main();
