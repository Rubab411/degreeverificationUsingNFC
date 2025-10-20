const express = require("express");
const router = express.Router();
const authcontrollers = require("../controller/auth-controller");
const validate = require("../middlewares/validate_middleware");
const signUpSchema = require("../validator/auth_validator");
// router.get('/',(req,res)=>{
//     res.status(200).send("welcome to the backend using router ");
// });

router.route('/').get(authcontrollers.home);
router.route('/register').post(validate(signUpSchema),authcontrollers.register);
router.route('/login').post(authcontrollers.login);


module.exports = router;
