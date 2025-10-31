const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB connection
mongoose.connect("mongodb+srv://AgriNova_db:1234@cluster0.mtti2ea.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Contact Message Schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
  ip: String,
  userAgent: String
});

const ContactMessage = mongoose.model("ContactMessage", contactSchema);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Serve smart monitoring page
app.get("/smart-monitoring", (req, res) => {
  res.sendFile(path.join(__dirname, "smart-monitoring.html"));
});

const dataFile = path.join(__dirname, "data", "messages.json");

// Handle contact messages with MongoDB
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Get client IP and user agent
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    let mongoId = null;
    try {
      const newMessage = new ContactMessage({
        name,
        email,
        message,
        ip,
        userAgent
      });

      await newMessage.save();
      mongoId = newMessage._id;
    } catch (mongoErr) {
      console.error("MongoDB save failed, proceeding with JSON only:", mongoErr.message);
    }

    // Always save to JSON file
    let messages = [];
    if (await fs.pathExists(dataFile)) {
      messages = await fs.readJson(dataFile);
    }
    messages.push({ name, email, message, date: new Date(), id: mongoId || Date.now().toString() });
    await fs.writeJson(dataFile, messages, { spaces: 2 });

    res.status(200).json({
      success: true,
      message: "Message saved successfully",
      id: mongoId || "json-only"
    });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save message"
    });
  }
});

// Get all contact messages (admin endpoint)
app.get("/api/contact/messages", async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ date: -1 });
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Smart monitoring endpoints
app.get("/api/weather/:lat/:lon", async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const response = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,showers_sum,snowfall_sum,weather_code&timezone=auto`);
    res.json(response.data);
  } catch (error) {
    console.error("Weather API error:", error);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

app.post("/api/ai-advice", async (req, res) => {
  try {
    const { cropType, weatherData, soilConditions } = req.body;

    // Integrate with OpenAI API for real AI advice
    const OpenAI = require("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `As an agricultural expert AI, provide farming advice for ${cropType} based on this weather data: ${JSON.stringify(weatherData)} and soil conditions: ${JSON.stringify(soilConditions)}. Include:
    1. Specific recommendations for the next 7 days
    2. Any weather-related alerts
    3. Step-by-step monitoring guide for farmers
    4. Irrigation and fertilization suggestions
    Format the response as JSON with keys: recommendations (array), alerts (array), monitoring_guide (array), irrigation_schedule (string)`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    const advice = JSON.parse(completion.choices[0].message.content);
    res.json(advice);
  } catch (error) {
    console.error("AI advice error:", error);
    // Fallback to mock response if OpenAI fails
    const advice = {
      recommendations: [
        "Monitor soil moisture levels regularly",
        "Apply organic fertilizers based on crop growth stage",
        "Implement integrated pest management practices",
        "Ensure proper drainage to prevent waterlogging"
      ],
      alerts: weatherData?.precipitation > 10 ? ["Heavy rainfall expected - prepare drainage systems"] : [],
      monitoring_guide: [
        "Check soil moisture daily using moisture meter",
        "Inspect leaves for signs of nutrient deficiency",
        "Monitor for pest activity early morning",
        "Record weather conditions and crop growth notes"
      ],
      irrigation_schedule: "Water every 2-3 days, adjusting based on rainfall and temperature"
    };
    res.json(advice);
  }
});

// Configure multer for file uploads
const multer = require('multer');
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

app.post("/api/health-analyze", upload.single('cropImage'), async (req, res) => {
  try {
    const { symptoms, cropType, environmentalFactors } = req.body;
    let imageAnalysis = '';

    // If image is uploaded, analyze it with AI
    if (req.file) {
      console.log('Image uploaded:', req.file.originalname, 'Size:', req.file.size);

      // Convert image to base64 for AI analysis
      const imageBuffer = req.file.buffer;
      const base64Image = imageBuffer.toString('base64');
      const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

      // Use OpenAI Vision API for image analysis
      const OpenAI = require("openai");
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const imagePrompt = `You are an expert agricultural pathologist. Analyze this crop image in detail and provide a comprehensive assessment. This is a ${cropType || 'crop'} plant.

      Examine the image carefully and provide detailed observations about:
      1. LEAF CONDITION: Color, texture, any discoloration, spots, lesions, wilting, curling, or unusual patterns
      2. STEM/PLANT STRUCTURE: Any bending, breaking, unusual growth, or structural abnormalities
      3. PESTS/DISEASE SIGNS: Visible insects, fungal growth, mold, mildew, or parasitic indicators
      4. SOIL/ROOT CONDITION: If visible, assess root health, soil condition, or root-related issues
      5. OVERALL PLANT HEALTH: General vigor, growth stage, nutritional status, and overall condition
      6. SPECIFIC SYMPTOMS: Identify any specific disease patterns, nutrient deficiencies, or pest damage

      Be specific about what you observe - colors, patterns, locations on the plant, severity, and any distinctive features. If the image quality is poor, note that as well.

      Provide your analysis in a structured format with clear observations.`;

      const imageCompletion = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: imagePrompt },
              {
                type: "image_url",
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 500,
      });

      imageAnalysis = imageCompletion.choices[0].message.content;
      console.log('Image analysis result:', imageAnalysis);
    }

    // Combine symptoms description with image analysis
    const combinedSymptoms = symptoms ?
      `${symptoms}${req.file ? '\n\nImage Analysis: ' + imageAnalysis : ''}` :
      imageAnalysis;

    // Integrate with OpenAI API for comprehensive health analysis
    const OpenAI = require("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are a professional agricultural pathologist with extensive experience in crop disease diagnosis and treatment. Based on the following detailed analysis, provide a comprehensive diagnosis and treatment plan.

    CROP TYPE: ${cropType || 'Unknown crop'}
    SYMPTOMS DESCRIPTION: ${symptoms || 'No text description provided'}
    IMAGE ANALYSIS: ${imageAnalysis}
    ENVIRONMENTAL FACTORS: ${environmentalFactors || 'Not specified'}

    As an expert, provide a DETAILED analysis including:

    1. PRIMARY DIAGNOSIS: Based on the symptoms and visual analysis, what is the most likely cause of the observed issues? Be specific about the disease, pest, or deficiency.

    2. SEVERITY ASSESSMENT: Evaluate the severity level (Low/Medium/High/Critical) based on:
       - Extent of plant damage
       - Rate of symptom progression
       - Potential for spread to other plants
       - Impact on yield and plant survival

    3. DETAILED TREATMENT PLAN: Provide a step-by-step treatment protocol including:
       - Immediate actions to contain the problem
       - Specific pesticides, fungicides, or fertilizers needed
       - Application methods and timing
       - Dosage recommendations
       - Safety precautions

    4. PREVENTION STRATEGIES: Long-term measures to prevent recurrence including:
       - Crop rotation recommendations
       - Soil management practices
       - Irrigation adjustments
       - Pest monitoring schedules
       - Resistant variety selection

    5. RECOVERY TIMELINE: Expected time for symptom improvement and full recovery

    6. PROFESSIONAL CONSULTATION: When and why to seek help from agricultural extension services or certified crop consultants

    Format your response as a valid JSON object with these exact keys: diagnosis, severity, treatment (array of detailed steps), prevention (array of preventive measures), recovery_time, professional_help

    Ensure your diagnosis is scientifically accurate and your recommendations are practical for smallholder farmers in developing countries.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    res.json(analysis);
  } catch (error) {
    console.error("Health analysis error:", error);
    // Fallback to mock response if OpenAI fails
    const analysis = {
      diagnosis: "Early signs of nutrient deficiency detected",
      severity: "Low",
      treatment: [
        "Apply balanced NPK fertilizer (10-10-10)",
        "Improve soil pH to optimal range (6.0-7.0)",
        "Ensure adequate water supply without waterlogging",
        "Monitor for pest activity and apply organic pesticides if needed"
      ],
      prevention: [
        "Regular soil testing every 3 months",
        "Implement proper crop rotation",
        "Maintain balanced fertilization program",
        "Ensure good drainage systems"
      ],
      recovery_time: "1-2 weeks with proper treatment",
      professional_help: "Seek immediate help if symptoms worsen or spread to more than 20% of crop"
    };
    res.json(analysis);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ DIPLO AGRINOVA running on port ${PORT}`));