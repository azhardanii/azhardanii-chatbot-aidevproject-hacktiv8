import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import fs from 'fs/promises'
import { GoogleGenAI } from '@google/genai'

const extractText = (data) => {
    try {
        const text = data?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
                     data?.candidates?.[0]?.content?.parts?.[0]?.text ??
                     data?.response?.candidates?.[0]?.content?.text
        return text ?? JSON.stringify(data, null, 2)
    } catch (err) {
        console.error("Error:", err);
        return JSON.stringify(data, null, 2);
    }
}

const app = express()
const upload = multer()
const modelGemini = 'gemini-2.5-flash'
const port = 3000
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
})

app.use(express.json())

app.post('/generate-text', async(req,res) => {
    try {
        // const {prompt} = req.body
        const prompt = req.body?.prompt
        if (!prompt) {
            res.status(400).json({ message: "Prompt tidak terdeteksi" })
            return
        }
        
        const aiResponse = await ai.models.generateContent({
            model: modelGemini,
            contents: prompt
        })
        res.json({ result: extractText(aiResponse) })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

app.post('/generate-text-from-image', upload.single('image'), async(req,res) => {
    try {
        const prompt = req.body?.prompt
        if (!prompt) {
            res.status(400).json({ message: "Prompt tidak terdeteksi" })
            return
        }

        const file = req.file
        if (!file) {
            res.status(400).json({ message: "Image tidak terdeteksi" })
            return
        }

        const imgBase64 = file.buffer.toString('base64')
        const aiResponse = await ai.models.generateContent({
            model: modelGemini,
            contents: [
                { text: prompt },
                { inlineData: { mimeType: file.mimetype, data: imgBase64 } }
            ]
        })

        res.json({ result: extractText(aiResponse) })
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
})

app.listen(port, () => {
    console.log(`http://localhost:${port}`)
})