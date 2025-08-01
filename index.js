import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenerativeAI } from '@google/generative-ai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const upload = multer({ storage: multer.memoryStorage() }) // Gunakan memory storage untuk buffer
const port = 3000

// Inisialisasi API dan Model dengan cara baru
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

// Helper function untuk konversi file buffer ke GenerativePart
const fileToGenerativePart = (file) => {
  return {
    inlineData: {
      data: file.buffer.toString("base64"),
      mimeType: file.mimetype,
    },
  };
};

app.use(cors())
app.use(express.json())
// Pastikan file index.html dan script.js ada di dalam folder 'public'
app.use(express.static(path.join(__dirname, 'public')))

// Generate dari chat teks
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body
        if (!Array.isArray(messages)) throw new Error("message must be an array")

        const history = messages.slice(0, -1).map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user', // role 'bot' diubah jadi 'model'
            parts: [{ text: msg.content }]
        }));
        
        const lastMessage = messages[messages.length - 1];

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage.content); // Menggunakan startChat dan sendMessage
        const response = await result.response;
        
        res.json({ result: response.text() })
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message })
    }
})

// Generate dari multimodal (image, document, audio)
const handleMultimodalRequest = async (req, res) => {
    try {
        const prompt = req.body?.prompt
        if (!prompt) {
            return res.status(400).json({ message: "Prompt tidak terdeteksi" })
        }

        const file = req.file
        if (!file) {
            return res.status(400).json({ message: "File tidak terdeteksi" })
        }
        
        const imagePart = fileToGenerativePart(file);
        
        // Panggil generateContent
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;

        res.json({ result: response.text() });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message })
    }
}

app.post('/generate-text-from-image', upload.single('image'), handleMultimodalRequest);
app.post('/generate-from-document', upload.single('document'), handleMultimodalRequest);
app.post('/generate-from-audio', upload.single('audio'), handleMultimodalRequest);


app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`)
})