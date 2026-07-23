# TECHNICAL SPECIFICATION DOCUMENT
## e-NAM (National Agriculture Market) API Integration Request

**[Annsetu Agritech Private Limited]**

---

| Document Control Parameter | Value / Details |
| :--- | :--- |
| **Document Version** | `1.0` |
| **Date** | `21-07-2026` |
| **Prepared By** | `Annsetu Engineering Team` |
| **Reviewed By** | `Chief Technology Officer / Authorized Signatory` |
| **Classification** | `Confidential / Internal` |
| **Submitted To** | `SFAC / e-NAM Technical Team, Ministry of Agriculture & Farmers' Welfare` |

---

## 1. Document Control

### 1.1 Revision History

| Version | Date | Author | Description of Change |
| :--- | :--- | :--- | :--- |
| `0.1` | 15-07-2026 | Annsetu Technical Team | Initial draft |
| `1.0` | 21-07-2026 | Annsetu Core Tech Team | Final specification document aligned with e-NAM Integration Template |

### 1.2 Purpose of this Document
This document specifies the technical and business requirements for integrating **Annsetu Agritech Private Limited**'s system with the e-NAM (National Agriculture Market) platform via its Application Programming Interface (API). It is intended for review by the e-NAM / SFAC technical team to evaluate and approve API access.

### 1.3 Scope
* **APIs / Data Modules Requested:** Commodity arrivals & prices, trade/transaction data, mandi master, commodity master, farmer/trader registration status lookup, and cold storage/logistics availability sync (PoP).
* **Systems and Environments Involved:** Developer Sandbox / UAT environment for integration dry-run and AWS India (`ap-south-1` Mumbai) Production environment.
* **Data Flow Direction:** Bidirectional (e-NAM → Annsetu for live market feeds & arrivals; Annsetu → e-NAM for cold storage capacity & logistics updates via Platform of Platforms framework).
* **Out of Scope:** Automated trade bidding on behalf of third parties without direct farmer authorization, high-frequency algorithmic trade execution, and commercial reselling of raw e-NAM feeds.

---

## 2. Requesting Organization Details

| Parameter | Details |
| :--- | :--- |
| **Organization Name** | Annsetu Agritech Private Limited |
| **Nature of Entity** | Private Company / Agritech Platform Provider |
| **Registration / CIN / License No.** | U01100UP2026PTC184920 |
| **Registered Address** | Plot No. 42, AgTech Hub, Sector 62, Noida, Uttar Pradesh - 201301 |
| **Authorized Signatory** | [Authorized Signatory Name], Founder & Chief Executive Officer |
| **Technical Contact** | [Technical Lead Name], CTO (`cto@annsetu.in`, +91-9876543210) |
| **Business Contact** | [Business Lead Name], VP Partnerships (`partnerships@annsetu.in`, +91-9876543211) |
| **Existing e-NAM Registration (if any)** | Yes (FPO Tech Partner Registration ID: `UP_FPO_ANNSETU_2026`) |

---

## 3. Business Use Case & Justification

### 3.1 Objective
Annsetu requires e-NAM API access to deliver real-time, high-precision mandi commodity prices, daily arrivals, and price trend analytics directly to smallholder farmers through the Annsetu mobile application. Furthermore, API access will allow Annsetu's cold storage ("Amad") management module to synchronize warehouse space and logistics booking data with e-NAM mandis, facilitating seamless post-harvest storage and trade settlement reconciliation.

### 3.2 Intended Users / Beneficiaries
* **Farmers:** Smallholder and marginal farmers using the Annsetu mobile app for transparent, real-time price discovery and decision support.
* **Cold Storage & Warehouse Operators:** Managing commodity holdings, space availability, and warehouse receipt integration.
* **Procurement Analysts & FPOs:** Tracking lot-level market trends, quality assaying scores, and trade volumes.
* **Traders & Logistics Providers:** Registered under FPOs needing verified price benchmarks and logistics dispatch tracking.

### 3.3 Expected Outcome / Impact
* **Empowering 100,000+ Farmers:** Across 1,600+ mandis in Uttar Pradesh and northern agricultural belts with instant modal price updates.
* **Eliminating Information Asymmetry:** Delivering price updates every 15 minutes during active trading hours (09:00 to 17:00 IST).
* **30% Faster Turnaround:** Improving post-harvest storage and logistics dispatch turnaround through direct cold storage booking synchronization.

---

## 4. e-NAM API Modules Requested

| Module | Description | Required (Y/N) |
| :--- | :--- | :---: |
| **Commodity Arrivals & Prices** | Daily arrivals, min/max/modal price by mandi & commodity | **Y** |
| **Trade / Transaction Data** | Lot-wise trade and bid data | **Y** |
| **Mandi Master** | List of integrated mandis with codes, location, state | **Y** |
| **Commodity Master** | Commodity and variety reference data | **Y** |
| **Farmer/Trader Registration** | Registration status lookup (if applicable) | **Y** |
| **Other (PoP Storage Sync)** | Cold storage space availability and warehousing slot sync | **Y** |

---

## 5. Integration Architecture Overview

Annsetu utilizes a microservices ingestion architecture backed by a Redis cluster to serve client queries efficiently while adhering strictly to e-NAM rate limits and SLA guidelines.

```
+-------------------------------------------------------------------+
|                     e-NAM Production Gateway                      |
|                  (api.enam.gov.in / NeGD API Setu)                |
+-------------------------------------------------------------------+
                                  ^
                                  | HTTPS REST / OAuth 2.0 + HMAC
                                  v
+-------------------------------------------------------------------+
|               Annsetu Ingestion Microservice Layer                |
|              (AWS ap-south-1 - Scheduled Polling)                 |
+-------------------------------------------------------------------+
             |                                    |
             v                                    v
+------------------------+            +-----------------------------+
|  Redis Cache Cluster   |            |  PostgreSQL Database        |
|  (TTL: 15-60 Mins)     |            |  (Analytical History & Logs)|
+------------------------+            +-----------------------------+
             ^                                    ^
             | Fast Memory Read                   | Historical Lookup
             +------------------+-----------------+
                                |
                                v
+-------------------------------------------------------------------+
|               Annsetu Core Express Server Gateway                 |
|                      (api.annsetu.in)                             |
+-------------------------------------------------------------------+
                                ^
                                | Secured REST API (Bearer Token)
                                v
+-------------------------------------------------------------------+
|        Annsetu Mobile Application (React Native / Expo)           |
+-------------------------------------------------------------------+
```

### 5.1 Integration Pattern
* **Consumption Model:** Scheduled polling (for market arrivals/prices) and Push via Webhook / REST callbacks (for trade status & storage slot updates).
* **Expected Call Frequency:** Once every 15 minutes per mandi during official trading hours (09:00 to 17:00 IST); off-market polling restricted to once every 2 hours.
* **Expected Data Volume:** ~25,000 records/day covering ~1,600 mandis and 200+ agricultural commodities.

---

## 6. Technical Requirements

### 6.1 Authentication & Authorization
* **Preferred/Required Mechanism:** OAuth 2.0 Client Credentials Flow combined with Dynamic HMAC-SHA256 Request Headers (`X-Signature`, `X-Timestamp`) as specified by e-NAM.
* **Token/Key Rotation Policy Expected:** OAuth 2.0 access tokens refreshed hourly (3,600 seconds); HMAC Signing Secrets and Client Keys rotated quarterly (every 90 days) or immediately upon security advisories.

### 6.2 Endpoints Requested

| Endpoint / Module | Method | Description | Frequency |
| :--- | :---: | :--- | :--- |
| `/api/v2/mandi/arrivals-prices` | `GET` | Fetch daily arrivals, min, max, and modal prices by mandi/commodity/date | Scheduled (Every 15 mins) |
| `/api/v2/master/mandi-list` | `GET` | Fetch master list of registered APMC mandis, state codes, and geolocations | Daily (00:00 IST) |
| `/api/v2/master/commodities` | `GET` | Fetch commodity master codes, categories, and variety mappings | Weekly |
| `/api/v2/trade/lot-summary` | `GET` | Fetch lot-wise trade bidding summaries and final settlement rates | Hourly |
| `/api/v2/pop/storage-sync` | `POST` | Push cold storage space availability, holdings, and e-NWR receipts | Real-time on booking event |

### 6.3 Request / Response Format
* **Data Format:** JSON (`application/json`)
* **Character Encoding:** UTF-8
* **Pagination Approach for Bulk Data:** Page-based pagination using `page` and `limit` parameters (maximum 1,000 records per payload) with header metadata (`X-Total-Count`, `X-Next-Page`).

### 6.4 Sample Payload (Illustrative — to be replaced with actual e-NAM schema)

```json
{
  "status": "SUCCESS",
  "mandi_code": "UP-AGR-001",
  "mandi_name": "Agra Mandi",
  "state": "Uttar Pradesh",
  "district": "Agra",
  "commodity": "Potato",
  "variety": "Jyoti",
  "arrival_date": "2026-07-21",
  "min_price": 1450.00,
  "max_price": 1680.00,
  "modal_price": 1560.00,
  "unit": "Quintal",
  "total_arrivals": 420.50
}
```

### 6.5 Error Handling
* **Expected Handling for Standard HTTP Status Codes:**
  * `200 OK`: Request succeeded; data returned.
  * `400 Bad Request`: Malformed JSON or invalid query parameters.
  * `401 Unauthorized`: Invalid OAuth Bearer token or HMAC signature verification failure.
  * `429 Too Many Requests`: Rate limit threshold hit.
  * `500 / 503 Internal Server Error`: e-NAM gateway temporary outage.
* **Retry Strategy:** Progressive exponential backoff with random jitter (base delay 1000ms, backoff factor 2, max 3 retries) on HTTP 429 and HTTP 5xx failures.

### 6.6 Rate Limits & Throttling
* **Requested Rate Limit:** 120 requests/minute (subject to e-NAM system policy).
* **Plan for Handling Throttling Responses (HTTP 429):** Integrated circuit breaker automatically halts active polling for 60 seconds and serves cached responses from Redis with a `stale: true` indicator to avoid service disruption.

---

## 7. Data Security & Compliance

* **Transport Security:** Mandatory TLS 1.3 / TLS 1.2 for all API communication over HTTPS.
* **Data Storage:** Encrypted at rest using AES-256 for PostgreSQL relational databases and Redis clusters hosted exclusively within India (AWS `ap-south-1` Mumbai region).
* **Data Usage Restriction:** Data will be used solely for the stated business purposes in Section 3 and will not be resold, scraped, or redistributed to commercial third parties without prior written consent.
* **Compliance:** Fully compliant with the Digital Personal Data Protection (DPDP) Act, 2023, MeitY Open Data Guidelines, and CERT-In cyber security standards.
* **Access Control:** Strict Role-Based Access Control (RBAC) governing internal microservices; production API keys stored in hardware-encrypted AWS Secrets Manager.
* **Audit Logging:** Immutable audit logs recording API request timestamps, originating IP addresses, queried endpoints, and HTTP response codes maintained for 365 days.

---

## 8. Environments & Testing

| Environment | Purpose | Target Timeline |
| :--- | :--- | :--- |
| **Sandbox / UAT** | Initial integration testing with sample data and pipeline validation | `01-08-2026 to 15-08-2026` |
| **Production** | Live data access post SFAC sign-off and IP whitelisting | `20-08-2026 onwards` |

### 8.1 Test Plan Summary
* **Functional Testing:** Automated test suites validating schema parsing, key presence, and UI price card rendering across all requested modules.
* **Load/Volume Testing:** Stress testing ingestion pipeline at 150% peak expected load (180 requests/minute).
* **Failure/Edge-Case Testing:** Simulating network drops, timeout events, malformed responses, HMAC signature mismatches, and HTTP 429 rate-limit breaches.
* **Sign-off Criteria:** 100% pass rate on functional test cases, zero high/critical vulnerabilities on CERT-In VAPT scan, and 48 hours of uninterrupted sandbox operation.

---

## 9. Support & Service Level Expectations

* **Expected API Uptime:** 99.5% availability during trading hours, as per e-NAM published SLA.
* **Support Channel for Integration Issues:** Primary email helpdesk (`nam@sfac.in` / `enam.helpdesk@gmail.com`) and NeGD API Setu support ticketing portal.
* **Escalation Contact for Production Incidents:** Annsetu 24/7 DevOps Desk (`devops@annsetu.in`, Phone: +91-9876543212); e-NAM technical escalation contact to be provided by SFAC.
* **Change Notification:** Minimum 30 days advance written notice requested for any breaking API schema updates, endpoint deprecations, or scheduled maintenance windows.

---

## 10. Approval & Sign-off

| Role | Name | Signature | Date |
| :--- | :--- | :---: | :---: |
| **Requesting Org. – Technical Lead** | [Technical Lead Name], CTO | *[Signed]* | 21-07-2026 |
| **Requesting Org. – Authorized Signatory** | [Authorized Signatory Name], CEO | *[Signed]* | 21-07-2026 |
| **e-NAM / SFAC – Reviewing Officer** | [Name] | *[Pending]* | [DD-MM-YYYY] |

---

## Annexure A: Glossary

* **APMC** — Agricultural Produce Market Committee
* **e-NAM** — National Agriculture Market electronic trading portal
* **SFAC** — Small Farmers' Agribusiness Consortium (lead implementing agency under Ministry of Agriculture & Farmers' Welfare)
* **Mandi** — Regulated agricultural market yard
* **Modal Price** — Most frequently occurring transacted price for a commodity on a given day

---

## Annexure B: Network Whitelisting Details (if required)

* **Static Outbound IP(s):** `13.235.45.12`, `13.235.45.13` *(AWS ap-south-1 NAT Gateways to be whitelisted by e-NAM)*
* **Domain(s) used for Callbacks/Webhooks:** `api.annsetu.in`, `webhook.annsetu.in`
