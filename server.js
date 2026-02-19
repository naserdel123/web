const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'offers.json');

// قراءة العروض
async function readOffers() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// كتابة العروض
async function writeOffers(offers) {
    await fs.writeFile(DATA_FILE, JSON.stringify(offers, null, 2));
}

// الحصول على جميع العروض
app.get('/api/offers', async (req, res) => {
    const offers = await readOffers();
    res.json(offers);
});

// إضافة عرض جديد
app.post('/api/offers', async (req, res) => {
    const offers = await readOffers();
    const newOffer = {
        id: Date.now(),
        ...req.body,
        date: new Date().toISOString()
    };
    offers.unshift(newOffer);
    await writeOffers(offers);
    res.json(newOffer);
});

// حذف عرض
app.delete('/api/offers/:id', async (req, res) => {
    let offers = await readOffers();
    offers = offers.filter(o => o.id != req.params.id);
    await writeOffers(offers);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
