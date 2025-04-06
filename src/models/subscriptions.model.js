/**
 * every time a user subscribes a channel a new document will be created with fields as subscriber and channel 
 * for any channel if we want the subscriber count then we will count the document with the same channel name
 * 
 * document is basically the entry to the mongodb
 * 
 * now if we want to find how many channels user has subscribed we will count the document with same subscribed user 
 * and the count of this subscribed user will be the required answer
 */


import {mongoose,Schema} from "mongoose";

const subsriptionSchema = new Schema({
    subscriber : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    channel : {
        type : Schema.Types.ObjectId,
        ref : "User"
    }

}, {timestamps : true})

export const Subsription = mongoose.model("Subsription",subsriptionSchema) 