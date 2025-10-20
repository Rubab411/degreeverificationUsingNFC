// const errorMiddleware = (err,req,res,next) => {
//     const status = err.status || 500;
//     const message = err.message  || "BACKEND ERROR";
//     const extraDetails = err.extraDetails || "Error from Backend";

//     return res.status(status).json({message,extraDetails});
// };


const errorMiddleware = (err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "BACKEND ERROR";

    // Agar Zod ka error hai tabhi extraDetails bhejo
    let extraDetails = undefined;
    if (err.extraDetails) {
        extraDetails = err.extraDetails;
    }

    return res.status(status).json(
        extraDetails ? { message, extraDetails } : { message }
    );
};
module.exports = errorMiddleware;



