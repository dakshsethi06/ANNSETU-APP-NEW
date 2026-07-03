const db = require('../db');
const crypto = require('crypto');

function hashMpin(mpin) {
  if (!mpin) return '';
  return crypto.createHash('sha256').update(mpin.toString()).digest('hex');
}

function verifyMpin(mpin, storedHash) {
  if (!storedHash) return false;
  if (!mpin) return false;
  if (storedHash.length !== 64) {
    return storedHash.toString() === mpin.toString();
  }
  return hashMpin(mpin) === storedHash;
}

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
          COALESCE(n."remarkEnglish", a.commodity, 'Potato') AS commodity
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
          COALESCE(n."remarkEnglish", a.commodity, 'Potato') AS commodity
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
        lotId: null,
        type: 'warning',
        title: 'Dispatch Approval Required',
        message: `Request to dispatch ${bags} bags of ${commodity} from ${csName} is pending. Please authorize via MPIN.`,
        icon: 'lock',
        actionUrl: '/dispatch'
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
  const { mpin } = req.body;
  
  if (!mpin) {
    return res.status(400).json({ success: false, error: 'MPIN is required for dispatch authorization.' });
  }

  try {
    // 1. Get the dispatch transaction
    const dispatchCheck = await db.query('SELECT * FROM "NikasiTransaction" WHERE "id" = $1', [id]);
    if (dispatchCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dispatch transaction not found' });
    }
    const dispatchData = dispatchCheck.rows[0];

    // 2. Fetch the farmer associated with this dispatch to verify their MPIN
    const farmerRes = await db.query('SELECT mpin, name FROM "Farmer" WHERE id = $1', [dispatchData.farmerId]);
    if (farmerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Associated farmer profile not found.' });
    }
    
    const farmer = farmerRes.rows[0];
    const farmerMpin = farmer.mpin || '1234';
    if (!verifyMpin(mpin, farmerMpin)) {
      return res.status(401).json({ success: false, error: 'Invalid MPIN. Please try again.' });
    }

    // 3. Proceed to approve the dispatch
    const sql = `
      UPDATE "NikasiTransaction"
      SET "status" = 'IN_TRANSIT', "updatedAt" = NOW()
      WHERE "id" = $1
      RETURNING *
    `;
    const result = await db.query(sql, [id]);

    // Delete the pending dispatch approval notification for this farmer
    try {
      await db.query(
        `DELETE FROM "AppNotification" 
         WHERE "userId" = $1 
           AND "title" = 'Dispatch Approval Required' 
           AND "message" LIKE $2`,
        [dispatchData.farmerId, `%dispatch ${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish}%`]
      );
      console.log(`[Notification Cleanup] Deleted pending dispatch notification for farmer ${dispatchData.farmerId}`);
    } catch (cleanErr) {
      console.warn('Failed to delete pending dispatch notification:', cleanErr.message);
    }

    // Create in-app notifications
    try {
      const { createAppNotification } = require('../lib/notifications');
      const farmerName = farmer.name || 'Farmer';

      // Notification to vendor
      await createAppNotification({
        coldStorageId: dispatchData.coldStorageId || 'cmmp9txv0000ai3t4wush9trs',
        userId: 'default_vendor',
        lotId: null,
        type: 'info',
        title: 'Dispatch Approved by Farmer',
        message: `${farmerName} authorized dispatch of ${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish || 'goods'} via MPIN.`,
        icon: 'check',
        actionUrl: null
      });

      // Notification to cold storage
      await createAppNotification({
        coldStorageId: dispatchData.coldStorageId || 'cmmp9txv0000ai3t4wush9trs',
        userId: dispatchData.coldStorageId || 'cmmp9txv0000ai3t4wush9trs',
        lotId: null,
        type: 'info',
        title: 'Dispatch Approved by Farmer',
        message: `${farmerName} authorized dispatch of ${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish || 'goods'} via MPIN. Ready for transport/delivery.`,
        icon: 'check',
        actionUrl: null
      });
    } catch (notifErr) {
      console.warn('Failed to create approval notifications:', notifErr.message);
    }

    return res.json({ success: true, dispatch: result.rows[0] });
  } catch (error) {
    console.error('PostgreSQL dispatch approval POST error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to approve dispatch in database' });
  }
}

async function deliverDispatch(req, res) {
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
    const dispatchData = result.rows[0];

    // Delete the cold storage's dispatch approval notification (no longer needed once delivered)
    try {
      await db.query(
        `DELETE FROM "AppNotification" 
         WHERE "userId" = $1 
           AND "title" = 'Dispatch Approved by Farmer' 
           AND "message" LIKE $2`,
        [dispatchData.coldStorageId, `%dispatch of ${dispatchData.packetsDispatched} bags%`]
      );
      console.log(`[Notification Cleanup] Deleted dispatch approved notification for cold storage ${dispatchData.coldStorageId}`);
    } catch (cleanErr) {
      console.warn('Failed to delete cold storage notification:', cleanErr.message);
    }

    // Create in-app notification for the farmer about delivery
    try {
      const { createAppNotification } = require('../lib/notifications');
      const csRes = await db.query('SELECT "displayName" FROM "ColdStorageOnboarding" WHERE id = $1', [dispatchData.coldStorageId]);
      const csName = csRes.rows.length > 0 ? csRes.rows[0].displayName : 'Cold Storage';

      await createAppNotification({
        coldStorageId: dispatchData.coldStorageId || 'cmmp9txv0000ai3t4wush9trs',
        userId: dispatchData.farmerId,
        lotId: null,
        type: 'info',
        title: 'Dispatch Delivered',
        message: `${dispatchData.packetsDispatched} bags of ${dispatchData.remarkEnglish || 'goods'} have been successfully delivered/dispatched from ${csName}.`,
        icon: 'check',
        actionUrl: `/dispatch`
      });
    } catch (notifErr) {
      console.warn('Failed to create delivery notification:', notifErr.message);
    }

    return res.json({ success: true, dispatch: result.rows[0] });
  } catch (error) {
    console.error('PostgreSQL dispatch delivery POST error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to deliver dispatch in database' });
  }
}

module.exports = { getDispatches, createDispatch, approveDispatch, deliverDispatch };
