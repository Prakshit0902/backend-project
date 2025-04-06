/*as we know that we will be connecting to the database frequently so instead of 
 *making the large syntax for connecting the db 
 *so we make the wrapper for this in the utils folder where we take the function 
 *and make the generalize function 
 *whenver we need to execute the function we will pass the functions in this method and return after executing the function
 
 *whenever there is any async call we will use this handler to avoid using the try-catch block everywhere improving the code readability
*/

// using the promise also we can do it 

const asyncHandler = (requestHandler) => {
    return (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err) => {
            next(err)
        })
    }
}



export {asyncHandler}



// using the try-catch

// const asynHandler = (fn) => {async () => {
//     }
// } the below code is same as above 



// const asynHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         console.log(error);
//         res.status(error.code || 500).json({
//             success : false,
//             message : error.message
//         })
//     }
// }

// export {asynHandler}