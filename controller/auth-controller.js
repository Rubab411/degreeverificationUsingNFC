const User = require("../models/user_model");

const home = async (req, res) => {
  try {
    res.status(200).send("welcome to the home page using controller");
  } catch (error) {
    res.status(400).send({ msg: "page not found" });
  }
};

// REGISTER
const register = async (req, res, next) => {
  try {
    const { username, email, phone, password } = req.body;

    const userExist = await User.findOne({ email });
    if (userExist) {
      return next({ status: 400, message: "Email already exists" });
    }

    const userCreated = await User.create({ username, email, phone, password });

    // send only needed fields
    const userData = {
      username: userCreated.username,
      email: userCreated.email,
      phone: userCreated.phone,
      id: userCreated._id.toString(),
    };

    res.status(201).json({
      msg: "User registered successfully",
      user: userData,
      token: await userCreated.generateToken(),
    });

  } catch (error) {
    console.error(error);
    next(error);
  }
};

// LOGIN
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userExist = await User.findOne({ email });
    if (!userExist) {
      return next({ status: 400, message: "Invalid credentials" });
    }

    const isMatch = await userExist.comparePassword(password);
    if (!isMatch) {
      return next({ status: 401, message: "Invalid email or password" });
    }

    const userData = {
      username: userExist.username,
      email: userExist.email,
      phone: userExist.phone,
      id: userExist._id.toString(),
    };

    res.status(200).json({
      msg: "Login successful",
      user: userData,
      token: await userExist.generateToken(),
    });

  } catch (error) {
    console.error(error);
    next(error);
  }
};

module.exports = { home, register, login };
