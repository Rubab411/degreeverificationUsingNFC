const validate = (schema)=>async(req,res,next)=>{
    try{
        const parseBody = await schema.parseAsync(req.body);
        req.body = parseBody;
        next();
    }
    catch(err){
        const status = 422;
        const message = 'Fill the input properly';
        const extraDetails = err.issues[0].message;

        const error = {
            status,
            message,
            extraDetails,
        };
        console.log(error);
      //  res.status(400).json({msg:message});
      next(error);

    }
};
module.exports = validate;


// const { ZodError } = require("zod");

// const validate = (schema) => async (req, res, next) => {
//   try {
//     const parseBody = await schema.parseAsync(req.body);
//     req.body = parseBody;
//     next();
//   } catch (err) {
//     if (err instanceof ZodError) {
//       // Zod ka error properly return karo
//       return res.status(400).json({ msg: err.issues[0].message });  // <-- fix
//     } else {
//       console.error("Validation middleware error:", err);
//       return res.status(500).json({ msg: "Internal Server Error" });
//     }
//   }
// };

// module.exports = validate;


