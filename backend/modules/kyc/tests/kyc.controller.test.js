const mockConfig = {
  cashfreeClientId: '',
  cashfreeClientSecret: '',
  nodeEnv: 'development'
};

jest.mock('../../../config', () => mockConfig);
jest.mock('../kyc.repository');
jest.mock('axios');

const axios = require('axios');
const repository = require('../kyc.repository');
const controller = require('../kyc.controller');

describe('KYC Controller Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to mock mode for standard tests
    mockConfig.cashfreeClientId = '';
    mockConfig.cashfreeClientSecret = '';

    res = {
      status: jest.fn().mockImplementation(function() { return this; }),
      json: jest.fn(),
      send: jest.fn(),
      redirect: jest.fn()
    };
  });

  describe('initiateDigiLocker', () => {
    it('returns mock consent URL when running in Mock Mode (no credentials)', async () => {
      req = {
        user: { id: 'farmer_123' },
        headers: { host: 'localhost:3001' },
        secure: false
      };

      // Mock DB save
      repository.createKycVerification.mockResolvedValue({});

      await controller.initiateDigiLocker(req, res);

      expect(repository.createKycVerification).toHaveBeenCalledWith('farmer_123', expect.stringContaining('kyc_farmer_'), 'PENDING');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        verification_id: expect.stringContaining('kyc_farmer_'),
        redirect_url: expect.stringContaining('http://localhost:3001/api/kyc/digilocker/mock-consent?verification_id='),
        mode: 'mock'
      }));
    });

    it('calls Cashfree API and returns redirect URL in real mode', async () => {
      // Configure credentials to force real mode
      mockConfig.cashfreeClientId = 'CF12345';
      mockConfig.cashfreeClientSecret = 'SECRET12345';

      req = {
        user: { id: 'farmer_123' },
        headers: { host: 'localhost:3001' },
        secure: false
      };

      axios.post.mockResolvedValue({
        status: 200,
        data: {
          reference_id: 'ref_987',
          url: 'https://verification.cashfree.com/digilocker/xyz'
        }
      });

      await controller.initiateDigiLocker(req, res);

      expect(axios.post).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        verification_id: expect.stringContaining('kyc_farmer_'),
        redirect_url: 'https://verification.cashfree.com/digilocker/xyz',
        mode: 'cashfree'
      });
    });
  });

  describe('checkDigiLockerStatus', () => {
    it('returns current status from database directly if status is SUCCESS', async () => {
      req = {
        params: { verification_id: 'verification_123' },
        user: { id: 'farmer_123' }
      };

      repository.getKycVerification.mockResolvedValue({
        farmerId: 'farmer_123',
        verificationId: 'verification_123',
        status: 'SUCCESS'
      });

      await controller.checkDigiLockerStatus(req, res);

      expect(repository.getKycVerification).toHaveBeenCalledWith('verification_123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'SUCCESS',
        message: 'KYC Verified successfully.'
      });
    });

    it('returns current status if mock mode is active and state is PENDING', async () => {
      req = {
        params: { verification_id: 'verification_123' }
      };

      repository.getKycVerification.mockResolvedValue({
        farmerId: 'farmer_123',
        verificationId: 'verification_123',
        status: 'PENDING'
      });

      await controller.checkDigiLockerStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'PENDING'
      });
    });

    it('calls Cashfree status and document APIs if real mode and status is PENDING', async () => {
      mockConfig.cashfreeClientId = 'CF12345';
      mockConfig.cashfreeClientSecret = 'SECRET12345';

      req = {
        params: { verification_id: 'verification_123' }
      };

      repository.getKycVerification.mockResolvedValue({
        farmerId: 'farmer_123',
        verificationId: 'verification_123',
        status: 'PENDING',
        referenceId: 'ref_987'
      });

      axios.get.mockImplementation(async (url) => {
        if (url.includes('/digilocker') && !url.includes('/document')) {
          return {
            status: 200,
            data: { status: 'AUTHENTICATED', reference_id: 'ref_987' }
          };
        }
        if (url.includes('/document/AADHAAR')) {
          return {
            status: 200,
            data: {
              data: {
                name: 'Test Farmer',
                aadhaar_number: '123456781234'
              }
            }
          };
        }
        if (url.includes('/document/PAN')) {
          return {
            status: 200,
            data: {
              data: {
                pan_number: 'ABCDE1234F'
              }
            }
          };
        }
        return { status: 400 };
      });

      await controller.checkDigiLockerStatus(req, res);

      expect(repository.updateFarmerKycDetails).toHaveBeenCalledWith('farmer_123', 'XXXX-XXXX-1234', 'XXXXX1234F');
      expect(repository.updateKycVerification).toHaveBeenCalledWith('verification_123', {
        referenceId: 'ref_987',
        status: 'SUCCESS'
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'SUCCESS',
        details: {
          name: 'Test Farmer',
          maskedAadhaar: 'XXXX-XXXX-1234',
          maskedPan: 'XXXXX1234F'
        }
      });
    });
  });

  describe('approveMockConsent', () => {
    it('updates farmer Aadhaar to mock value and redirects to callback URL', async () => {
      req = {
        query: { verification_id: 'verification_123' },
        headers: { host: 'localhost:3001' },
        secure: false
      };

      repository.getKycVerification.mockResolvedValue({
        farmerId: 'farmer_123',
        verificationId: 'verification_123',
        status: 'PENDING'
      });

      await controller.approveMockConsent(req, res);

      expect(repository.updateFarmerKycDetails).toHaveBeenCalledWith('farmer_123', 'XXXX-XXXX-9999', 'XXXXX9999P');
      expect(repository.updateKycVerification).toHaveBeenCalledWith('verification_123', { status: 'SUCCESS' });
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3001/api/kyc/digilocker/callback?verification_id=verification_123&status=SUCCESS');
    });
  });

  describe('verifyBankAccountSync', () => {
    it('verifies bank account synchronously and saves to database', async () => {
      mockConfig.cashfreeClientId = 'CF12345';
      mockConfig.cashfreeClientSecret = 'SECRET12345';

      req = {
        user: { id: 'farmer_123' },
        body: {
          bankAccount: '00011020001772',
          ifsc: 'HDFC0000001',
          name: 'Test Farmer'
        }
      };

      axios.post.mockResolvedValue({
        status: 200,
        data: {
          account_status: 'VALID',
          registered_name: 'Test Farmer Registered'
        }
      });

      await controller.verifyBankAccountSync(req, res);

      expect(repository.updateFarmerBankDetails).toHaveBeenCalledWith(
        'farmer_123',
        '00011020001772',
        'HDFC0000001',
        'Test Farmer Registered'
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        accountStatus: 'VALID',
        registeredName: 'Test Farmer Registered'
      }));
    });
  });
});
