import mongoose from 'mongoose'

const Client = new mongoose.Schema({
    phoneNumber: { type: String, default: "####", },
    name: { type: String, default: "####" },
})

export default mongoose.model('Clients', Client)
