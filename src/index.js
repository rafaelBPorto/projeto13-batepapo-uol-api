import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import { MongoClient } from "mongodb";
import joi from "joi";

const nameSchema = joi.object({ name: joi.string().required() })

const app = express();
app.use(cors());
dotenv.config();
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
    await mongoClient.connect();
    console.log("MongoBD Conectado");
} catch (err) {
    console.log(err);
}

const db = mongoClient.db("bpUol")
const collectionParticipants = db.collection("participants")
const collectionMessages = db.collection("messages")


//ROTAS

app.post("/participants", async (req, res) => {
    const { name } = req.body

    const timeEnter = Date.now()

    const hours = new Date().getHours()
    const minutes = new Date().getMinutes()
    const seconds = new Date().getSeconds()

    console.log(req.body)
    console.log(name)

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
        await collectionParticipants.insertOne({ name, lastStatus: timeEnter });
        await collectionMessages.insertOne({
            from: name,
            to: 'Todos',
            type: 'status',
            time: `${hours}:${minutes}:${seconds}`
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

app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`));