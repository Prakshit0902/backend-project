/**
 * why using this apihandler ? --> because it will standardize the Error format 
 * whenever we will get any error it will be in this format only 
 * we made the class with super class as Error and override the fields as shown below
 * the super calls the class Error with message
 * the captureStackTrace traces the stack of error in the files 
 */


class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors


        if (stack){
            this.stack = stack
        }
        else {
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}