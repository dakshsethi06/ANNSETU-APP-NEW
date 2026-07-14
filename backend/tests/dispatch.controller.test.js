jest.mock('../modules/dispatch/dispatch.service', () => ({
  fetchDispatches: jest.fn(),
  createNewDispatch: jest.fn(),
  approveDispatchByMpin: jest.fn(),
  markDispatchDelivered: jest.fn(),
}));

const dispatchService = require('../modules/dispatch/dispatch.service');
const controller = require('../modules/dispatch/dispatch.controller');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('dispatch.controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { query: {}, body: {}, params: {} };
    res = mockRes();
  });

  describe('getDispatches', () => {
    test('returns dispatches with success true', async () => {
      const fake = [{ id: 'N1' }];
      dispatchService.fetchDispatches.mockResolvedValue(fake);
      req.query = { farmerId: 'F1' };

      await controller.getDispatches(req, res);
      expect(dispatchService.fetchDispatches).toHaveBeenCalledWith({ farmerId: 'F1' });
      expect(res.json).toHaveBeenCalledWith({ success: true, dispatches: fake });
    });

    test('returns 500 when service throws', async () => {
      dispatchService.fetchDispatches.mockRejectedValue(new Error('boom'));
      await controller.getDispatches(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('createDispatch', () => {
    test('returns 201 with the created dispatch', async () => {
      const fake = { id: 'N1' };
      dispatchService.createNewDispatch.mockResolvedValue(fake);
      req.body = { farmerId: 'F1' };

      await controller.createDispatch(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, dispatch: fake });
    });

    test('uses error statusCode when service throws with one', async () => {
      const err = new Error('coldStorageId is required.');
      err.statusCode = 400;
      dispatchService.createNewDispatch.mockRejectedValue(err);

      await controller.createDispatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'coldStorageId is required.' })
      );
    });

    test('defaults to 500 when error has no statusCode', async () => {
      dispatchService.createNewDispatch.mockRejectedValue(new Error('db down'));
      await controller.createDispatch(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('approveDispatch', () => {
    test('approves with id from params and mpin from body', async () => {
      const fake = { id: 'N1', status: 'IN_TRANSIT' };
      dispatchService.approveDispatchByMpin.mockResolvedValue(fake);
      req.params = { id: 'N1' };
      req.body = { mpin: '1234' };

      await controller.approveDispatch(req, res);
      expect(dispatchService.approveDispatchByMpin).toHaveBeenCalledWith('N1', '1234');
      expect(res.json).toHaveBeenCalledWith({ success: true, dispatch: fake });
    });

    test('propagates 401 statusCode for wrong mpin', async () => {
      const err = new Error('Invalid MPIN');
      err.statusCode = 401;
      dispatchService.approveDispatchByMpin.mockRejectedValue(err);
      req.params = { id: 'N1' };
      req.body = { mpin: '0000' };

      await controller.approveDispatch(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('deliverDispatch', () => {
    test('marks delivered and returns the dispatch', async () => {
      const fake = { id: 'N1', status: 'DISPATCHED' };
      dispatchService.markDispatchDelivered.mockResolvedValue(fake);
      req.params = { id: 'N1' };

      await controller.deliverDispatch(req, res);
      expect(dispatchService.markDispatchDelivered).toHaveBeenCalledWith('N1');
      expect(res.json).toHaveBeenCalledWith({ success: true, dispatch: fake });
    });

    test('returns error status when delivery fails', async () => {
      const err = new Error('Dispatch not found');
      err.statusCode = 404;
      dispatchService.markDispatchDelivered.mockRejectedValue(err);
      req.params = { id: 'GHOST' };

      await controller.deliverDispatch(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});