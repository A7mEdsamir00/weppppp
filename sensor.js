// إعدادات الـ API
const API_BASE_URL = 'https://earlyingwarning3.runasp.net';
const API_ENDPOINT = '/api/SensorData/process';
const API_URL = API_BASE_URL + API_ENDPOINT;
const API_KEY = 'YOUR_API_KEY';                                // استبدلها بمفتاحك الفعلي
const UPDATE_INTERVAL = 10000;                                 // زيادة فترة التحديث إلى 10 ثوانٍ

// متغيرات التطبيق
let temperatureChart;
let temperatureHistory = [];
let retryCount = 0;
const MAX_RETRIES = 3;

// ==============================================
// دالة محسنة للاتصال بالـ API
// ==============================================
async function fetchSensorData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // timeout بعد 8 ثوانٍ

        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP Error! Status: ${response.status}`);
        }

        retryCount = 0; // إعادة تعيين عداد المحاولات
        return await response.json();

    } catch (error) {
        retryCount++;
        
        if (retryCount <= MAX_RETRIES) {
            console.warn(`محاولة ${retryCount}/${MAX_RETRIES}: إعادة المحاولة...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // انتظار 2 ثانية
            return fetchSensorData();
        }

        throw error;
    }
}

// ==============================================
// إدارة حالات الخطأ المحسنة
// ==============================================
async function handleDataFetch() {
    try {
        const data = await fetchSensorData();
        updateUI(data);
        updateConnectionStatus(true);
    } catch (error) {
        console.error('فشل جلب البيانات:', error);
        updateConnectionStatus(false, getErrorMessage(error));
        
        // استخدام بيانات الطوارئ مع تنبيه
        const fallbackData = generateFallbackData();
        fallbackData.isFallback = true;
        updateUI(fallbackData);
        
        addAlert(`خطأ: ${getErrorMessage(error)}`, 'danger');
    }
}

function getErrorMessage(error) {
    if (error.name === 'AbortError') {
        return 'تجاوز وقت الانتظار';
    } else if (error.message.includes('Failed to fetch')) {
        return 'تعذر الاتصال بالخادم';
    } else if (error.message.includes('HTTP')) {
        return `خطأ من الخادم: ${error.message}`;
    }
    return 'خطأ غير متوقع';
}

// ==============================================
// دوال مساعدة محسنة
// ==============================================
function generateFallbackData() {
    const now = new Date();
    return {
        temperature: Math.floor(Math.random() * 15 + 20),
        humidity: Math.floor(Math.random() * 40 + 30),
        smoke: Math.floor(Math.random() * 80),
        flame: false,
        timestamp: now.toISOString()
    };
}

function updateConnectionStatus(isConnected, message = '') {
    const statusElement = document.getElementById('connectionStatus');
    const icon = statusElement.querySelector('i');
    const text = statusElement.querySelector('span');

    statusElement.className = `connection-status ${isConnected ? 'connected' : 'error'}`;
    icon.className = `fas fa-circle ${isConnected ? 'connected' : 'error'}`;
    text.textContent = isConnected ? 'متصل بالخادم' : message || 'فشل الاتصال';
}

// ==============================================
// التهيئة والتشغيل
// ==============================================
async function initApp() {
    // التحميل الأولي
    await handleDataFetch();
    
    // التحديث الدوري
    setInterval(handleDataFetch, UPDATE_INTERVAL);
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', initApp);

// (أبقِ دوال updateUI, updateChart, addAlert كما هي من الإصدار السابق)