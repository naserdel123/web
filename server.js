const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    next();
});

app.use(express.json());
app.use('/uploads', express.static('uploads'));

const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('الملف يجب أن يكون صورة'));
        }
    }
});

const DATA_FILE = path.join(__dirname, 'offers.json');

// قائمة الدول والمدن
const LOCATIONS = {
    'السعودية': ['تبوك', 'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'أبها', 'حائل', 'القصيم', 'جازان', 'نجران', 'الجوف', 'الحدود الشمالية'],
    'الإمارات': ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة', 'أم القيوين'],
    'الكويت': ['الكويت العاصمة', 'الفروانية', 'حولي', 'الأحمدي', 'الجهراء', 'مبارك الكبير'],
    'قطر': ['الدوحة', 'الريان', 'الخور', 'الوكرة', 'الشمال', 'أم صلال'],
    'البحرين': ['المنامة', 'المحرق', 'الشمالية', 'الجنوبية'],
    'عمان': ['مسقط', 'صلالة', 'نزوى', 'صحار', 'صور'],
    'مصر': ['القاهرة', 'الإسكندرية', 'الجيزة', 'شرم الشيخ', 'الغردقة', 'الأقصر', 'أسوان'],
    'الأردن': ['عمان', 'إربد', 'الزرقاء', 'العقبة', 'جرش']
};

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

// GET العروض حسب المدينة
app.get('/api/offers/city/:city', async (req, res) => {
    await initFile();
    const offers = await readOffers();
    const cityOffers = offers.filter(o => o.city === req.params.city);
    res.json(cityOffers);
});

// GET العروض حسب الدولة
app.get('/api/offers/country/:country', async (req, res) => {
    await initFile();
    const offers = await readOffers();
    const countryOffers = offers.filter(o => o.country === req.params.country);
    res.json(countryOffers);
});

// GET قائمة الدول والمدن
app.get('/api/locations', (req, res) => {
    res.json(LOCATIONS);
});

// POST إضافة عرض
app.post('/api/offers', upload.array('images', 4), async (req, res) => {
    await initFile();
    
    if (!req.files || req.files.length !== 4) {
        return res.status(400).json({ error: 'يجب رفع 4 صور' });
    }

    const offers = await readOffers();
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    
    const newOffer = {
        id: Date.now(),
        productName: req.body.productName,
        socialLink: req.body.socialLink,
        bio: req.body.bio || '',
        price: req.body.price || '',
        currency: req.body.currency || 'ر.س',
        country: req.body.country,
        city: req.body.city,
        images: req.files.map(file => `${protocol}://${host}/uploads/${file.filename}`),
        date: new Date().toISOString()
    };
    
    offers.unshift(newOffer);
    await writeOffers(offers);
    res.status(201).json(newOffer);
});

// DELETE حذف عرض
app.delete('/api/offers/:id', async (req, res) => {
    await initFile();
    const offers = await readOffers();
    const offer = offers.find(o => o.id == req.params.id);
    
    if (offer) {
        for (const imgUrl of offer.images) {
            const filename = path.basename(imgUrl);
            try {
                await fs.unlink(path.join(uploadDir, filename));
            } catch (e) {
                console.log('خطأ في حذف الصورة:', e.message);
            }
        }
    }
    
    const filtered = offers.filter(o => o.id != req.params.id);
    await writeOffers(filtered);
    res.json({ success: true });
});

// صفحات
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/embed', (req, res) => {
    res.sendFile(path.join(__dirname, 'embed.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
