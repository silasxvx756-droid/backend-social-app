import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

/* ======================
   🔥 CONEXÃO MONGODB
====================== */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB conectado"))
  .catch((err) => console.log("Erro MongoDB:", err));

/* ======================
   🧠 MODEL POST
====================== */
const PostSchema = new mongoose.Schema({
  user: {
    id: String,
    username: String,
    displayName: String,
    avatar: String,
  },
  content: String,
  image: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Post = mongoose.model("Post", PostSchema);

/* ======================
   📬 EMAIL VERIFICATION
====================== */

const verificationCodes = {};

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "silasxvxx@gmail.com",
    pass: "e1BIZZ0nUz7d2kQ8",
  },
});

app.post("/send-code", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email é obrigatório" });

  const code = generateCode();
  verificationCodes[email] = code;

  try {
    await transporter.sendMail({
      from: '"Seu App" <seuemail@gmail.com>',
      to: email,
      subject: "Seu código de verificação",
      text: `Seu código de verificação é: ${code}`,
    });

    res.json({ message: "Código enviado com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao enviar email" });
  }
});

app.post("/verify-code", (req, res) => {
  const { email, code } = req.body;

  if (verificationCodes[email] === code) {
    delete verificationCodes[email];
    return res.json({ verified: true });
  }

  res.status(400).json({ verified: false });
});

/* ======================
   📸 POSTS
====================== */

// Criar post
app.post("/posts", async (req, res) => {
  try {
    const post = new Post(req.body);
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar posts
app.get("/posts", async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json(posts);
});

app.listen(3000, () => {
  console.log("🚀 Servidor rodando na porta 3000");
});