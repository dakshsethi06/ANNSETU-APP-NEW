const { Pool } = require('pg');

const OLD_ADMIN_DB = 'postgresql://postgres.qqvcgyzbxcwsmbojwojx:b!32a%40NiK%26_-8vC@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const NEW_DB = 'postgresql://postgres.ypqygmbdlebfmnodgzhr:0ThQAEsC8pHLZJbI@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

const oldPool = new Pool({ connectionString: OLD_ADMIN_DB, ssl: { rejectUnauthorized: false } });
const newPool = new Pool({ connectionString: NEW_DB, ssl: { rejectUnauthorized: false } });

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

function buildColType(col) {
  if (col.data_type === 'USER-DEFINED') return 'TEXT';
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
    'integer': 'INTEGER', 'bigint': 'BIGINT', 'smallint': 'SMALLINT',
    'boolean': 'BOOLEAN', 'text': 'TEXT', 'json': 'JSON', 'jsonb': 'JSONB',
    'uuid': 'UUID', 'timestamp without time zone': 'TIMESTAMP',
    'timestamp with time zone': 'TIMESTAMPTZ', 'double precision': 'DOUBLE PRECISION',
    'real': 'REAL', 'date': 'DATE', 'bytea': 'BYTEA',
  };
  return mapping[col.data_type] || col.data_type.toUpperCase();
}

async function main() {
  try {
    const res = await oldPool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tables = res.rows.map(r => r.table_name);
    
    for (const t of tables) {
      console.log(`\nProcessing table ${t}...`);
      const oldCols = await getColumns(oldPool, 'public', t);
      const newCols = await getColumns(newPool, 'admin', t);
      
      if (newCols.length === 0) {
        console.log(`  Table does not exist. Creating...`);
        const colDefs = oldCols.map(c => `"${c.column_name}" ${buildColType(c)}`).join(', ');
        await newPool.query(`CREATE TABLE "admin"."${t}" (${colDefs});`);
      } else {
        const newColNames = newCols.map(c => c.column_name);
        for (const c of oldCols) {
          if (!newColNames.includes(c.column_name)) {
            console.log(`  Adding missing column: ${c.column_name}`);
            await newPool.query(`ALTER TABLE "admin"."${t}" ADD COLUMN "${c.column_name}" ${buildColType(c)};`);
          }
        }
      }
      
      console.log(`  Copying data...`);
      const data = await oldPool.query(`SELECT * FROM "${t}"`);
      if (data.rows.length > 0) {
        // use columns that exist in BOTH to avoid insert errors if there's any mismatch we couldn't resolve
        const currentNewCols = await getColumns(newPool, 'admin', t);
        const colNames = currentNewCols.map(c => c.column_name).filter(cn => oldCols.some(oc => oc.column_name === cn));
        
        let inserted = 0;
        for (const row of data.rows) {
          const vals = colNames.map(cn => row[cn]);
          const colsStr = colNames.map(c => `"${c}"`).join(', ');
          const placeholders = colNames.map((_, i) => `$${i + 1}`).join(', ');
          try {
            await newPool.query(
              `INSERT INTO "admin"."${t}" (${colsStr}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
              vals
            );
            inserted++;
          } catch(e) {
            // ignore
          }
        }
        console.log(`  Inserted ${inserted} rows.`);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    oldPool.end();
    newPool.end();
  }
}
main();
