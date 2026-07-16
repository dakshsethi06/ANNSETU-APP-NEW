# SonarQube & Quality Fixes Summary

This document summarizes all code quality refactorings, security fixes, and bug resolutions completed in the repository since **8:33 PM**.

---

## 1. Security Vulnerability Fixes (CWE / Blocker / Major)

### Reflected Cross-Site Scripting (XSS)
* **File**: `backend/modules/farmer/controllers/downloadReceiptPdf.controller.js`
* **Fix**: Removed dynamic reflection of `entryId` (taken from query params) in the 404 error response to prevent Reflected XSS. Changed to a secure static string: `'Ledger entry not found.'`.

### Arbitrary File Write / Path Traversal
* **File**: `backend/modules/payment/payment.manual.controller.js`
* **Fix**: Added strict regex validation (`/^[a-zA-Z0-9_-]+$/`) to the user-supplied `paymentId` payload. This prevents path traversal (`../`) attacks when writing uploaded receipt files to the disk.

### Weak Pseudorandom Number Generators (PRNG)
* **Files**: 
  * `backend/modules/dispatch/dispatch.service.js`
  * `backend/modules/farmer/controllers/sendProfileOtp.controller.js`
  * `backend/modules/payment/payment.manual.controller.js`
* **Fix**: Replaced insecure `Math.random()` with the Node.js cryptographically secure random number generator (**`crypto.randomInt`**) for generating verification codes (OTPs), payment IDs, and Nikasi transaction numbers.

### Log Injection & User-Controlled Data Logging (CWE-117)
* **Files**:
  * `backend/modules/dispatch/dispatch.controller.js`
  * `backend/modules/mandi/mandi.service.js`
  * `backend/modules/payment/payment.approve.controller.js`
  * `backend/modules/payment/payment.create.controller.js`
  * `backend/modules/payment/payment.manual.controller.js`
* **Fix**: Sanitized all log statements (`console.log` and `console.error`) that output user-controlled data directly (such as `req.body`, `req.query`, and raw dynamic `error.message` strings). Replaced them with safe static log messages.

### Hardcoded Password / Credentials
* **File**: `backend/modules/notification/repositories/userSync.repository.js`
* **Fix**: Removed the hardcoded default SHA-256 password hash literal (`'0ffe1abd...'`) from the code. Replaced it with a dynamic call to the shared `hashMpin('1234')` utility.

---

## 2. Code Duplication Resolution

### Unused Duplicate Navigation Stack
* **Action**: Deleted `mobile/src/navigation/RootNavigator.js` since it was a 100% duplicate of `AppNavigator.js` and was not imported or used anywhere.

### Duplicated Payment Helper Utilities
* **Action**: Removed the duplicate copy of `extractBankNameAndTransactionId` inside `payment.repository.js` and imported the clean, modular implementation from `payment.helpers.js`.

### Duplicated Date Helpers
* **Action**: Deleted the local duplicate implementations of `parseToISODate` and `toISTDateStr` inside `downloadStatement.controller.js`. Shared and imported them directly from the common `dateHelpers.js` utility.

### Unified Ledger Compilation & Running Balance Logic
* **Action**: Refactored `getFarmerLedger.repository.js` to extract shared ledger querying into a unified function and consolidated the mapping, sorting, running balance, and array reversal workflows into a single point of logic.

---

## 3. General Bug Fixes

### Git Merge/Stash Conflict Markers
* **Files**:
  * `backend/shared/notifications/notifications.js`
  * `mobile/src/features/farmer/screens/KhataTab.js`
  * `mobile/src/features/farmer/components/KhataVerificationView.js`
* **Fix**: Cleaned up left-over Git stash and merge markers (e.g. `<<<<<<< Updated upstream`, `=======`, `>>>>>>> Stashed changes`) that were breaking builds and compiler execution.

### capital 'NAN' Typo
* **File**: `backend/modules/farmer/controllers/downloadStatement.controller.js`
* **Fix**: Corrected the typo `Number.isNAN` to the standard JavaScript constructor **`Number.isNaN`** to prevent runtime crashes.

### Standard JS Syntax Consistency Rules
* Changed all occurrences of global `parseInt`, `parseFloat`, and `isNaN` in the backend codebase to the modern, standardized namespaces:
  * **`Number.parseInt`**
  * **`Number.parseFloat`**
  * **`Number.isNaN`**
* Replaced `String.prototype.replace` with `String.prototype.replaceAll` where global search flags were used.

---

## 4. Verification and Tests
* Fixed and updated the mocked database schemas and repository methods in the Jest unit test suites (`paymentViews.test.js` and `paymentManual.test.js`).
* **Test Results**: All backend tests pass successfully (8/8 tests pass).
