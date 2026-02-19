const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'offers.json');

// إنشاء الملف إذا لم ي exists
async function initFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, '[]');
    }
}

async function readOffers() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeOffers(offers) {
    await fs.writeFile(DATA_FILE, JSON.stringify(offers, null, 2));
}

// GET جميع العروض
app.get('/api/offers', async (req, res) => {
    await initFile();
    const offers = await readOffers();
    res.json(offers);
});

// POST إضافة عرض
app.post('/api/offers', async (req, res) => {
    await initFile();
    const offers = await readOffers();
    
    const newOffer = {
        id: Date.now(),
        productName: req.body.productName,
        socialLink: req.body.socialLink,
        images: req.body.images,
        date: new Date().toISOString()
    };
    
    offers.unshift(newOffer);
    await writeOffers(offers);
    res.status(201).json(newOffer);
});

// DELETE حذف عرض
app.delete('/api/offers/:id', async (req, res) => {
    await initFile();
    let offers = await readOffers();
    offers = offers.filter(o => o.id != req.params.id);
    await writeOffers(offers);
    res.json({ success: true });
});

// صفحة رئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
