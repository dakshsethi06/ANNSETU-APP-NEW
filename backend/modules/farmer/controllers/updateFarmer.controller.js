const db = require('../../../config/database');

async function updateFarmer(req, res) {
  const { id } = req.params;
  const { name, phone, email } = req.body;

  try {
    const existing = await db.query('SELECT * FROM "Farmer" WHERE "id" = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Farmer profile not found.' });
    }

    const current = existing.rows[0];
    const finalName = name !== undefined ? name : current.name;
    const finalPhone = phone !== undefined ? phone : current.phone;
    const finalEmail = email !== undefined ? email : current.email;

    const result = await db.query(
      `UPDATE "Farmer"
     SET "name" = $1,
         "phone" = $2,
         "email" = $3,
         "updatedAt" = NOW()
     WHERE "id" = $4
     RETURNING "id" AS "serial_number", "name", "state", "primaryCrop" AS commodity, "fatherName", "phone", "email", "village", "district", "tehsil"`,
      [finalName, finalPhone, finalEmail, id]
    );

    return res.json({ success: true, farmer: result.rows[0] });
  } catch (error) {
    console.error('PostgreSQL updateFarmer error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update farmer profile.' });
  }
}

module.exports = { updateFarmer };
