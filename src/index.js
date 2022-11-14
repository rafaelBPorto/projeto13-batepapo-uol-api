import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from 'dayjs'


//MongoDB Schemas
const nameSchema = joi.object({ name: joi.string().required() })
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()
})
const UserSchema = joi.object({ User: joi.string().required() })

//Basic settings

const app = express();
app.use(cors());
dotenv.config();
app.use(express.json());


//Connect to MongoDB

const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
    await mongoClient.connect();
    console.log("MongoBD Conectado");
} catch (err) {
    console.log(err);
}

//MongoDB collections variables

const db = mongoClient.db("bpUol")
const collectionParticipants = db.collection("participants")
const collectionMessages = db.collection("messages")


//ROUTES

app.post("/participants", async (req, res) => {
    const { name } = req.body

    const now = dayjs()
    const enterRoom = Date.now()

    const validation = nameSchema.validate(req.body, { abortEarly: false });

    //Name Validation
    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message)
        res.status(422).send(errors);
        return;
    }

    //Test name already exist
    try {
        const resp = await collectionParticipants.findOne({ name: { $regex: name, $options: 'i' } })

        if (resp) {
            res.status(409).send("Este nome já está sendo utilizado!")
            return;
        }

    } catch (err) {
        console.log(err);
        res.status(500);
    }

    //Insert name on db
    try {
        await collectionParticipants.insertOne({ name, lastStatus: enterRoom });
        await collectionMessages.insertOne({
            from: name,
            to: 'Todos',
            text: 'entrou na sala',
            type: 'status',
            time: now.format("HH:mm:ss")
        })
        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err);
    }
})

app.get("/participants", async (req, res) => {

    try {
        const participants = await collectionParticipants.find().toArray();
        console.log(participants)
        res.send(participants)
    } catch (err) {
        console.log(err);
        res.sendStatus(500)
    }
})

app.post("/messages", async (req, res) => {
    const validationBody = messageSchema.validate(req.body, { abortEarly: false });

    //Hearder validation
    //verificar se hearder esta correto - ok
    //verificar se header user existe - pendente
    let validationHeaders = null
    if (req.headers.user) {
        validationHeaders = UserSchema.validate({ User: req.headers.user })
    } else {
        res.status(422).send("Incorrect headers")
        return
    }

    //Body validation
    //Verificar se o body esta correto - ok
    if (validationBody.error) {
        console.log(validationBody.error)
        res.status(422).send("Incorrect body")
        return
    }

    //Save new message
    //verificar se o recptor da mensagem existe - ok
    try {
        const from = await collectionParticipants.findOne({ "name": req.body.to })
        if (from) {
            const now = dayjs().format("HH:mm:ss")
            await collectionMessages.insertOne({
                from: req.headers.user,
                to: req.body.to,
                text: req.body.text,
                type: req.body.type,
                time: now,
            })
            console.log("Nova mensagem adicionada")
            res.sendStatus(201)
        } else {
            res.status(422).send("Receiver not found")
            return
        }
    } catch (err) {
        res.sendStatus(500)
    }


})

app.get("/messages", async (req, res) => {
    const limit  = Number(req.query.limit)
    const user = req.headers.user
    console.log(user)
    console.log(limit)
    if (!limit) {
        try {
            const messages = await collectionMessages.find({$or:[
                {from:user},
                {type:"message"},
                {type:"status"},
                {to:user },
                {to: "Todos"}
            ]}).toArray()
            res.send(messages)
        } catch (err) {
            console.log(err)
            res.sendStatus(500)
        }
    }else{
        try {
            const messages = await collectionMessages.find({$or:[
                {from:user},
                {type:"message"},
                {type:"status"},
                {to:user },
                {to: "Todos"}
            ]}).limit(limit).toArray()
            res.send(messages)
        } catch (err) {
            console.log(err)
            res.sendStatus(500)
        }
    }

})


app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`));