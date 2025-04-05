/**
 * Also the ApiResponse will be used for standard response 
 */

class ApiResponse {
    constructor(statusCode,data,message = "Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}