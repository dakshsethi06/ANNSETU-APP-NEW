const axios = require('axios');
const config = require('../../config');
const repository = require('./kyc.repository');

const CASHFREE_SANDBOX_URL = 'https://sandbox.cashfree.com/verification';
const CASHFREE_PROD_URL = 'https://api.cashfree.com/verification';

// Helper to determine if we should run in Mock Mode
function isMockMode() {
  return !config.cashfreeClientId || 
         !config.cashfreeClientSecret || 
         config.cashfreeClientId === 'your_sandbox_client_id';
}

// Helper to get Cashfree request headers
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-client-id': config.cashfreeClientId,
    'x-client-secret': config.cashfreeClientSecret
  };
}

// Helper to get Cashfree Base URL based on client credentials
function getBaseUrl() {
  if (config.cashfreeClientSecret && config.cashfreeClientSecret.includes('prod')) {
    return CASHFREE_PROD_URL;
  }
  return CASHFREE_SANDBOX_URL;
}

/**
 * Intelligent Name Matching helper: Supports exact match, partial token overlap (e.g. Laxmi vs Laxmi Devi),
 * and official Cashfree Name Match API (if live credentials are active).
 */
async function verifyNameMatch(profileName, documentName) {
  if (!profileName || !documentName) {
    return { isMatch: true, score: 1.0, reason: 'Name missing for comparison' };
  }

  const pName = String(profileName).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const dName = String(documentName).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // 1. Exact match
  if (pName === dName) {
    return { isMatch: true, score: 1.0, reason: 'Exact Match' };
  }

  // 2. Token / Partial Name Match (e.g. "Laxmi" vs "Laxmi Devi", "Laxmi Sethi" vs "Laxmi")
  const pTokens = pName.split(/\s+/).filter(t => t.length > 1);
  const dTokens = dName.split(/\s+/).filter(t => t.length > 1);

  const common = pTokens.filter(t => dTokens.includes(t));
  const isSubsetP = pTokens.every(t => dTokens.includes(t));
  const isSubsetD = dTokens.every(t => pTokens.includes(t));

  if (isSubsetP || isSubsetD || common.length > 0) {
    return { isMatch: true, score: 0.85, reason: 'Partial Token Match' };
  }

  // 3. Cashfree Name Match API Call (if credentials are present)
  if (!isMockMode()) {
    try {
      const url = `${getBaseUrl()}/name-match`;
      const cfResponse = await axios.post(url, { name_1: profileName, name_2: documentName }, { headers: getHeaders() });
      if (cfResponse.status === 200 && cfResponse.data) {
        const score = cfResponse.data.score || cfResponse.data.match_score || 0;
        const isMatch = cfResponse.data.result === 'MATCH' || score >= 0.5;
        return {
          isMatch,
          score,
          reason: cfResponse.data.reason || `Cashfree Name Match Score: ${score}`
        };
      }
    } catch (cfErr) {
      console.warn('⚠️ Cashfree Name Match API call failed, defaulting to local evaluation:', cfErr.message);
    }
  }

  return { isMatch: false, score: 0.0, reason: 'Name Mismatch' };
}

async function initiateDigiLocker(req, res) {
  try {
    const farmerId = req.user.id;
    if (!farmerId) {
      return res.status(400).json({ success: false, error: 'User context not found.' });
    }

    const verificationId = `kyc_farmer_${farmerId}_${Date.now()}`;
    const host = req.headers.host;
    // Protocol can be http in dev, fallback to https for production
    const protocol = req.secure || config.nodeEnv === 'production' ? 'https' : 'http';
    // Cashfree requires HTTPS redirect URL even in sandbox environment
    const redirectUrl = `https://${host}/api/kyc/digilocker/callback`;

    // 1. Create a pending verification record in the database
    await repository.createKycVerification(farmerId, verificationId, 'PENDING');

    if (isMockMode()) {
      console.log(`ℹ️ Cashfree credentials missing or placeholder. Running in Mock KYC Mode for verificationId: ${verificationId}`);
      const mockConsentUrl = `${protocol}://${host}/api/kyc/digilocker/mock-consent?verification_id=${verificationId}`;
      return res.json({
        success: true,
        verification_id: verificationId,
        redirect_url: mockConsentUrl,
        mode: 'mock'
      });
    }

    // 2. Call Cashfree Create DigiLocker URL API
    const response = await axios.post(`${getBaseUrl()}/digilocker`, {
      verification_id: verificationId,
      redirect_url: redirectUrl,
      document_requested: ['AADHAAR', 'PAN']
    }, { headers: getHeaders() });

    if (response.status === 200 && response.data) {
      // Save reference_id to the database verification record
      await repository.updateKycVerification(verificationId, {
        referenceId: response.data.reference_id,
        status: 'PENDING'
      });

      return res.json({
        success: true,
        verification_id: verificationId,
        redirect_url: response.data.url,
        mode: 'cashfree'
      });
    } else {
      throw new Error(response.data?.message || 'Failed to generate DigiLocker URL from Cashfree');
    }

  } catch (error) {
    console.error('❌ initiateDigiLocker error:', error.message);
    if (error.response) {
      console.error('Cashfree response error data:', error.response.data);
    }
    return res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message || 'Failed to initiate KYC verification.',
      details: error.response ? error.response.data : null
    });
  }
}

async function checkDigiLockerStatus(req, res) {
  try {
    const { verification_id } = req.params;
    if (!verification_id) {
      return res.status(400).json({ success: false, error: 'Verification ID required.' });
    }

    // 1. Check local DB state first
    const record = await repository.getKycVerification(verification_id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Verification record not found.' });
    }

    if (record.status === 'SUCCESS') {
      return res.json({ success: true, status: 'SUCCESS', message: 'KYC Verified successfully.' });
    }
    if (record.status === 'FAILED' || record.status === 'EXPIRED') {
      return res.json({ success: false, status: record.status, error: 'KYC Verification failed.' });
    }

    // If Mock Mode
    if (isMockMode()) {
      return res.json({ success: true, status: record.status });
    }

    // 2. Poll Cashfree for the current status
    const statusUrl = `${getBaseUrl()}/digilocker?verification_id=${verification_id}`;
    const statusResponse = await axios.get(statusUrl, { headers: getHeaders() });

    if (statusResponse.status === 200 && statusResponse.data) {
      const { status: cfStatus, reference_id: refId } = statusResponse.data;

      const isAuthSuccess = ['AUTHENTICATED', 'SUCCESS', 'AUTHENTICATION_SUCCESS', 'VALID', 'COMPLETED'].includes(cfStatus);

      if (isAuthSuccess) {
        // 3. Retrieve Aadhaar document details
        const docUrl = `${getBaseUrl()}/digilocker/document/AADHAAR`;
        let docData = null;
        try {
          const docResponse = await axios.get(docUrl, {
            headers: getHeaders(),
            params: {
              reference_id: refId || record.referenceId,
              verification_id
            }
          });
          if (docResponse.status === 200 && docResponse.data) {
            docData = docResponse.data;
          }
        } catch (err) {
          console.error('⚠️ Failed to retrieve Aadhaar document details:', err.message);
        }

        // 4. Retrieve PAN document details
        const panUrl = `${getBaseUrl()}/digilocker/document/PAN`;
        let panData = null;
        try {
          const panResponse = await axios.get(panUrl, {
            headers: getHeaders(),
            params: {
              reference_id: refId || record.referenceId,
              verification_id
            }
          });
          if (panResponse.status === 200 && panResponse.data) {
            panData = panResponse.data;
          }
        } catch (err) {
          console.error('⚠️ Failed to retrieve PAN document details:', err.message);
        }

        const name = docData?.data?.name || docData?.name || panData?.data?.name || 'Verified Farmer';
        
        // Name Verification Check against Farmer Profile
        let profileName = null;
        try {
          const { getFarmersData } = require('../farmer/repositories/getFarmersData.repository');
          const farmerRows = await getFarmersData('', record.farmerId);
          if (farmerRows && farmerRows.length > 0) {
            profileName = farmerRows[0].name;
          }
        } catch (e) {
          console.warn('Could not fetch farmer profile for name match check:', e.message);
        }

        if (profileName && name && name !== 'Verified Farmer') {
          const nameCheck = await verifyNameMatch(profileName, name);
          if (!nameCheck.isMatch) {
            return res.status(400).json({
              success: false,
              status: 'FAILED',
              error: `Name Mismatch: Profile name ('${profileName}') does not match document name ('${name}'). Please verify with your own documents.`
            });
          }
        }

        const rawAadhaar = docData?.data?.aadhaar_number || docData?.aadhaar_number || docData?.data?.uid || docData?.uid || '';
        const last4 = (rawAadhaar + '').slice(-4) || '8888';
        const maskedAadhaar = `XXXX-XXXX-${last4}`;

        let maskedPan = 'XXXXX9999P';
        const rawPan = panData?.data?.pan_number || panData?.document_data?.pan_number || panData?.pan_number || '';
        if (rawPan) {
          const panLast5 = (rawPan + '').slice(-5) || '9999P';
          maskedPan = `XXXXX${panLast5}`;
        }

        // Update database tables
        await repository.updateFarmerKycDetails(record.farmerId, maskedAadhaar, maskedPan);
        await repository.updateKycVerification(verification_id, {
          referenceId: refId || record.referenceId,
          status: 'SUCCESS'
        });

        return res.json({
          success: true,
          status: 'SUCCESS',
          details: { name, maskedAadhaar, maskedPan }
        });
      } else if (cfStatus === 'EXPIRED' || cfStatus === 'FAILED') {
        await repository.updateKycVerification(verification_id, { status: cfStatus });
        return res.json({ success: false, status: cfStatus, error: `Verification status returned: ${cfStatus}` });
      } else {
        // Still pending
        return res.json({ success: true, status: 'PENDING' });
      }
    } else {
      throw new Error('Failed to fetch status from Cashfree');
    }

  } catch (error) {
    console.error('❌ checkDigiLockerStatus error:', error.message);
    if (error.response) {
      console.error('Cashfree response error data:', error.response.data);
    }
    return res.status(500).json({ success: false, error: error.message || 'Failed to check status.' });
  }
}

// Serve a simple HTML Mock DigiLocker Consent Page
function serveMockConsentPage(req, res) {
  const { verification_id } = req.query;
  const protocol = req.secure || config.nodeEnv === 'production' ? 'https' : 'http';
  const callbackUrl = `${protocol}://${req.headers.host}/api/kyc/digilocker/mock-consent/approve?verification_id=${verification_id}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mock DigiLocker Consent</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #f4f6f9; color: #333; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
        h1 { color: #1E5C2E; font-size: 24px; margin-bottom: 10px; }
        p { font-size: 14px; color: #666; margin-bottom: 25px; line-height: 1.5; }
        .btn { background: #1E5C2E; color: white; border: none; padding: 12px 24px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.2s; }
        .btn:hover { background: #154020; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>DigiLocker Consent</h1>
        <p>This is a <strong>Mock Consent Screen</strong> simulating the government DigiLocker portal for local development. By clicking below, you grant Annsetu consent to fetch your Aadhaar card details.</p>
        <a href="${callbackUrl}" class="btn">Approve & Share Aadhaar</a>
      </div>
    </body>
    </html>
  `;
  res.send(html);
}

// Handle Mock Consent Approval
async function approveMockConsent(req, res) {
  try {
    const { verification_id } = req.query;
    if (!verification_id) {
      return res.status(400).send('Missing verification_id.');
    }

    const record = await repository.getKycVerification(verification_id);
    if (!record) {
      return res.status(404).send('Verification record not found.');
    }

    // Mock update: set status to SUCCESS, update Farmer Aadhaar and PAN
    const mockMaskedAadhaar = 'XXXX-XXXX-9999';
    const mockMaskedPan = 'XXXXX9999P';
    await repository.updateFarmerKycDetails(record.farmerId, mockMaskedAadhaar, mockMaskedPan);
    await repository.updateKycVerification(verification_id, { status: 'SUCCESS' });

    // Redirect to the normal callback page (the WebView will intercept this URL)
    const host = req.headers.host;
    const protocol = req.secure || config.nodeEnv === 'production' ? 'https' : 'http';
    res.redirect(`${protocol}://${host}/api/kyc/digilocker/callback?verification_id=${verification_id}&status=SUCCESS`);
  } catch (error) {
    console.error('❌ approveMockConsent error:', error.message);
    res.status(500).send('Mock consent approval failed: ' + error.message);
  }
}

// Serve callback page
function serveCallbackPage(req, res) {
  const { verification_id, status } = req.query;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KYC Status</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; text-align: center; }
          .container { padding: 20px; border-radius: 12px; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .icon { font-size: 48px; margin-bottom: 12px; }
          h2 { margin: 0 0 8px 0; color: #0f172a; }
          p { margin: 0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${status === 'SUCCESS' ? '✅' : '⏳'}</div>
          <h2>${status === 'SUCCESS' ? 'Verification Complete' : 'Processing Verification'}</h2>
          <p>${status === 'SUCCESS' ? 'You can now close this window.' : 'Please wait while we verify your details.'}</p>
        </div>
      </body>
    </html>
  `;
  res.send(html);
}

/**
 * Bank Account Verification Sync V2
 */
async function verifyBankAccountSync(req, res) {
  try {
    const farmerId = req.user.id;
    if (!farmerId) {
      return res.status(401).json({ success: false, error: 'Unauthorized user.' });
    }

    const { bankAccount, ifsc, name } = req.body;
    if (!bankAccount || !ifsc) {
      return res.status(400).json({ success: false, error: 'Bank account number and IFSC code are required.' });
    }

    const cleanAccount = String(bankAccount).trim();
    const cleanIfsc = String(ifsc).trim().toUpperCase();

    // Check mock mode or missing credentials
    if (isMockMode()) {
      console.log(`ℹ️ Running Mock Bank Account Verification Sync V2 for farmer: ${farmerId}`);
      const mockName = name || 'Verified Account Holder';
      await repository.updateFarmerBankDetails(farmerId, cleanAccount, cleanIfsc, mockName);
      return res.json({
        success: true,
        accountStatus: 'VALID',
        registeredName: mockName,
        maskedAccount: `XXXX${cleanAccount.slice(-4)}`,
        ifsc: cleanIfsc,
        mode: 'mock'
      });
    }

    // Real Cashfree BAV Sync V2 API Call
    const url = `${getBaseUrl()}/bank-account/sync`;
    const payload = {
      bank_account: cleanAccount,
      ifsc: cleanIfsc,
      name: name || undefined
    };

    const response = await axios.post(url, payload, { headers: getHeaders() });

    if (response.status === 200 && response.data) {
      const data = response.data;
      const accountStatus = data.account_status || data.accountStatus || 'VALID';
      const registeredName = data.registered_name || data.registeredName || name || 'Verified Account Holder';

      if (accountStatus === 'VALID' || data.account_status_code === 'ACCOUNT_IS_VALID') {
        await repository.updateFarmerBankDetails(farmerId, cleanAccount, cleanIfsc, registeredName);
        return res.json({
          success: true,
          accountStatus: 'VALID',
          registeredName,
          maskedAccount: `XXXX${cleanAccount.slice(-4)}`,
          ifsc: cleanIfsc,
          mode: 'cashfree'
        });
      } else {
        return res.status(400).json({
          success: false,
          accountStatus: accountStatus,
          error: data.message || 'Bank account verification failed. Invalid account details.'
        });
      }
    } else {
      throw new Error('Failed to verify bank account via Cashfree API.');
    }

  } catch (error) {
    console.error('❌ verifyBankAccountSync error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error during bank verification.' });
  }
}

module.exports = {
  initiateDigiLocker,
  checkDigiLockerStatus,
  serveMockConsentPage,
  approveMockConsent,
  serveCallbackPage,
  verifyBankAccountSync
};
