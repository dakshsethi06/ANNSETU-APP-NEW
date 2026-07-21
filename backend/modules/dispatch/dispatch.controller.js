const dispatchService = require('./dispatch.service');

async function getDispatches(req, res) {
  try {
    const dispatches = await dispatchService.fetchDispatches(req.query);
    return res.json({ success: true, dispatches });
  } catch (error) {
    console.error('Dispatch GET error');
    return res.status(500).json({ success: false, error: 'Failed to fetch dispatches from database' });
  }
}

async function createDispatch(req, res) {
  try {
    const dispatch = await dispatchService.createNewDispatch(req.body);
    return res.status(201).json({ success: true, dispatch });
  } catch (error) {
    console.error('Dispatch POST error');
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to create dispatch in database' });
  }
}

async function approveDispatch(req, res) {
  try {
    const dispatch = await dispatchService.approveDispatchByMpin(req.params.id, req.body.mpin);
    return res.json({ success: true, dispatch });
  } catch (error) {
    console.error('Dispatch approval error');
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to approve dispatch in database' });
  }
}

async function deliverDispatch(req, res) {
  try {
    const dispatch = await dispatchService.markDispatchDelivered(req.params.id);
    return res.json({ success: true, dispatch });
  } catch (error) {
    console.error('Dispatch delivery error');
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message || 'Failed to deliver dispatch in database' });
  }
}

module.exports = { getDispatches, createDispatch, approveDispatch, deliverDispatch };
