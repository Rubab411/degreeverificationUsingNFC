const express = require('express');
const router = express.Router();
const {
  sendVerifierOtp,
  verifyVerifierOtp,
  scanStudentByUid,
  getAllVerifierLogs
} = require('../controller/verifier-controller');

router.post('/send-otp', sendVerifierOtp);        // { email }
router.post('/verify-otp', verifyVerifierOtp);    // { email, otp }
router.post('/scan', scanStudentByUid);  
router.get('/logs', getAllVerifierLogs);          // { uid, email }  (email optional when logged in)

module.exports = router;
