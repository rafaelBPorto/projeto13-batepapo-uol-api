import express from "express";
import cors from "cors"
import dotenv from "dotenv"
import { MongoClient } from "mongodb";

const app = express();
app.use(cors());
dotenv.config();
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
    await mongoClient.connect();
    console.log("MongoBD Conectado");
} catch (err) {
    console.log(err)
}

const db = mongoClient.db("bate-papo-uol")


app.listen(process.env.PORT, () => console.log(`Server running in port: ${process.env.PORT}`))