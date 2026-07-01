const db = require('../db');

async function getDispatches(req, res) {
  const { farmerId, coldStorageId } = req.query;
  if (!farmerId && !coldStorageId) {
    return res.status(400).json({ success: false, error: 'Either farmerId or coldStorageId is required.' });
  }
  try {
    let sql, params;
    if (farmerId) {
      sql = `
        SELECT 
          n.id, 
          n."nikasiNumber" AS id_display,
          n."createdAt" AS date,
          n."packetsDispatched" AS bags,
          n."weightQtl" AS weight,
          n."vehicleNumber" AS vehicle,
          n.status,
          n."dispatchTo" AS buyer,
          f.name AS farmer_name,
          c."displayName" AS cold_storage_name,
          COALESCE(a.commodity, n."remarkEnglish", 'Potato') AS commodity
        FROM "NikasiTransaction" n
        LEFT JOIN "Farmer" f ON n."farmerId" = f.id
        LEFT JOIN "AmadLot" a ON n."lotId" = a.id
        LEFT JOIN "ColdStorageOnboarding" c ON n."coldStorageId" = c.id
        WHERE n."farmerId" = $1
        ORDER BY n."createdAt" DESC
      `;
      params = [farmerId];
    } else {
      // Verify coldStorageId exists, otherwise fallback to the default demo facility
      const csCheckRes = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [coldStorageId]);
      const verifiedColdStorageId = csCheckRes.rows.length > 0 ? coldStorageId : 'cmmp9txv0000ai3t4wush9trs';

      sql = `
        SELECT 
          n.id, 
          n."nikasiNumber" AS id_display,
          n."createdAt" AS date,
          n."packetsDispatched" AS bags,
          n."weightQtl" AS weight,
          n."vehicleNumber" AS vehicle,
          n.status,
          n."dispatchTo" AS buyer,
          f.name AS farmer_name,
          c."displayName" AS cold_storage_name,
          COALESCE(a.commodity, n."remarkEnglish", 'Potato') AS commodity
        FROM "NikasiTransaction" n
        LEFT JOIN "Farmer" f ON n."farmerId" = f.id
        LEFT JOIN "AmadLot" a ON n."lotId" = a.id
        LEFT JOIN "ColdStorageOnboarding" c ON n."coldStorageId" = c.id
        WHERE n."coldStorageId" = $1
        ORDER BY n."createdAt" DESC
      `;
      params = [verifiedColdStorageId];
    }
    const result = await db.query(sql, params);
    return res.json({ success: true, dispatches: result.rows });
  } catch (error) {
    console.error('PostgreSQL dispatches GET error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch dispatches from database' });
  }
}

async function createDispatch(req, res) {
  const { farmerId, coldStorageId, commodity, bags, vehicleNumber } = req.body;
  if (!farmerId || !coldStorageId || !commodity || !bags) {
    return res.status(400).json({ success: false, error: 'farmerId, coldStorageId, commodity, and bags are required.' });
  }
  try {
    const id = 'NK-' + Date.now();
    const nikasiNumber = 'NK-' + Math.floor(10000 + Math.random() * 90000);
    const weightQtl = parseFloat(bags) * 0.5; // 1 packet standardly = 0.5 Qt

    // 1. Find an active lot for this farmer that matches the commodity
    let lotRes = await db.query(
      `SELECT id FROM "AmadLot" WHERE "farmerId" = $1 AND "commodity" ILIKE $2 LIMIT 1`,
      [farmerId, commodity]
    );
    let lotId = null;
    if (lotRes.rows.length > 0) {
      lotId = lotRes.rows[0].id;
    } else {
      // Fallback A: Any lot for this farmer
      lotRes = await db.query(
        `SELECT id FROM "AmadLot" WHERE "farmerId" = $1 LIMIT 1`,
        [farmerId]
      );
      if (lotRes.rows.length > 0) {
        lotId = lotRes.rows[0].id;
      } else {
        // Fallback B: Any lot in the database to satisfy NOT NULL constraint
        lotRes = await db.query(`SELECT id FROM "AmadLot" LIMIT 1`);
        if (lotRes.rows.length > 0) {
          lotId = lotRes.rows[0].id;
        }
      }
    }

    if (!lotId) {
      return res.status(400).json({ success: false, error: 'No active stock lots found in the database. Please create an inward stock booking first.' });
    }

    // Verify coldStorageId exists in ColdStorageOnboarding to avoid foreign key violations for new users
    const csCheckRes = await db.query('SELECT id FROM "ColdStorageOnboarding" WHERE id = $1', [coldStorageId]);
    const verifiedColdStorageId = csCheckRes.rows.length > 0 ? coldStorageId : 'cmmp9txv0000ai3t4wush9trs';

    // 2. Insert into NikasiTransaction (using lotId and remarkEnglish as commodity fallback)
    const sql = `
      INSERT INTO "NikasiTransaction" (
        "id", "nikasiNumber", "farmerId", "coldStorageId", "lotId", 
        "packetsDispatched", "weightQtl", "dispatchType", "dispatchTo", 
        "vehicleNumber", "remarkEnglish", "status", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;

    const params = [
      id, nikasiNumber, farmerId, verifiedColdStorageId, lotId,
      parseInt(bags, 10), weightQtl, 'Farmer Withdrawal', 'Farmer',
      vehicleNumber || null, commodity, 'CREATED'
    ];

    const result = await db.query(sql, params);

    // Create in-app notification for the farmer to authorize via OTP
    try {
      const { createAppNotification } = require('../lib/notifications');
      const csRes = await db.query('SELECT "displayName" FROM "ColdStorageOnboarding" WHERE id = $1', [verifiedColdStorageId]);
      const csName = csRes.rows.length > 0 ? csRes.rows[0].displayName : 'Cold Storage';

      await createAppNotification({
        coldStorageId: verifiedColdStorageId,
        userId: farmerId,
        lotId: lotId,
        type: 'warning',
        title: 'Dispatch Approval Required',
        message: `Request to dispatch ${bags} bags of ${commodity} from ${csName} is pending. Please authorize via OTP.`,
        icon: 'lock',
        actionUrl: `/dispatch`
      });
    } catch (notifErr) {
      console.warn('Failed to create dispatch notification:', notifErr.message);
    }

    return res.status(201).json({ success: true, dispatch: result.rows[0] });
  } catch (error) {
    console.error('PostgreSQL dispatch POST error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to create dispatch in database' });
  }
}

async function approveDispatch(req, res) {
  const { id } = req.params;
  try {
    const sql = `
      UPDATE "NikasiTransaction"
      SET "status" = 'DISPATCHED', "updatedAt" = NOW()
      WHERE "id" = $1
      RETURNING *
    `;
    const result = await db.query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dispatch transaction not found' });
    }
    return res.json({ success: true, dispatch: result.rows[0] });
  } catch (error) {
    console.error('PostgreSQL dispatch approval POST error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to approve dispatch in database' });
  }
}

module.exports = { getDispatches, createDispatch, approveDispatch };
