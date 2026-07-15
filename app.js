// ============================================
// VEGETABLE INVENTORY SYSTEM - NEPAL
// तरकारी व्यवस्थापन प्रणाली - नेपाल
// ============================================

// ===== SUPABASE CONFIGURATION =====
const SUPABASE_URL = 'https://yvrojwxlqgwlrvxrvinu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2cm9qd3hscWd3bHJ2eHJ2aW51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwOTc5OTgsImV4cCI6MjA5OTY3Mzk5OH0.uIHkcbKM5Sg3iP5kXB13KFw3aj4gS4aQr0PNOU6aY0g';

// Wait for Supabase to be available
let supabaseClient = null;
let supabaseReady = false;

function waitForSupabase(callback, retries = 20) {
    if (window.supabase && window.supabase.createClient) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            supabaseReady = true;
            console.log('✅ Supabase connected!');
            if (callback) callback();
            return true;
        } catch (e) {
            console.error('Supabase init error:', e);
        }
    }
    if (retries > 0) {
        console.log('Waiting for Supabase... retries left:', retries);
        setTimeout(() => waitForSupabase(callback, retries - 1), 500);
    } else {
        console.error('❌ Supabase failed to load');
        showToast('Database connection failed. Check internet.', 'error');
    }
    return false;
}

// ===== GLOBAL STATE =====
let currentUser = null;
let vegetables = [];
let farmers = [];
let buyers = [];
let retailStock = [];
let retailSales = [];
let wholesaleBatches = [];
let wholesaleSales = [];
let wasteRecords = [];
let expenses = [];

// ===== CURRENCY FORMATTER (Nepali Rupee) =====
function formatMoney(amount) {
    return 'रू' + (parseFloat(amount) || 0).toFixed(2);
}

// ===== LOGIN SYSTEM =====
function login() {
    console.log('Login button clicked');
    const key = document.getElementById('access-key').value.trim();
    
    if (key === 'admin123') {
        currentUser = 'admin';
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('main-app').classList.add('active');
        
        showToast('स्वागतम्! Welcome to Vegetable Inventory!', 'success');
        
        // Load data after Supabase is ready
        if (supabaseReady) {
            loadAllData();
        } else {
            waitForSupabase(() => loadAllData());
        }
    } else {
        showToast('गलत पासवर्ड! Wrong password! Try: admin123', 'error');
    }
}

function logout() {
    currentUser = null;
    document.getElementById('main-app').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('access-key').value = '';
}

// ===== NAVIGATION =====
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    const navBtn = document.querySelector(`[data-section="${sectionId}"]`);
    
    if (section) section.classList.add('active');
    if (navBtn) navBtn.classList.add('active');
    
    if (sectionId === 'vegetables') loadVegetables();
    if (sectionId === 'retail') { loadRetailStock(); loadRetailSales(); }
    if (sectionId === 'wholesale') { loadWholesaleBatches(); loadWholesaleSales(); }
    if (sectionId === 'farmers') loadFarmers();
    if (sectionId === 'buyers') loadBuyers();
    if (sectionId === 'waste') loadWasteRecords();
    if (sectionId === 'expenses') loadExpenses();
    if (sectionId === 'reports') loadDashboard();
    if (sectionId === 'dashboard') loadDashboard();
}

function showRetailSub(view) {
    document.querySelectorAll('#retail .sub-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#retail .sub-btn').forEach(b => b.classList.remove('active'));
    
    const viewEl = document.getElementById(`retail-${view}-view`);
    if (viewEl) viewEl.classList.add('active');
    
    if (event && event.target) event.target.classList.add('active');
}

function showWholesaleSub(view) {
    document.querySelectorAll('#wholesale .sub-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('#wholesale .sub-btn').forEach(b => b.classList.remove('active'));
    
    const viewEl = document.getElementById(`wholesale-${view}-view`);
    if (viewEl) viewEl.classList.add('active');
    
    if (event && event.target) event.target.classList.add('active');
}

// ===== MODAL SYSTEM =====
function openModal(content) {
    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('modal');
    if (modalBody) modalBody.innerHTML = content;
    if (modal) modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('active');
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== SAFE SUPABASE CALLS =====
async function dbSelect(table, columns = '*') {
    if (!supabaseReady || !supabaseClient) {
        showToast('Database not ready. Please wait...', 'error');
        return { data: null, error: new Error('Not connected') };
    }
    try {
        return await supabaseClient.from(table).select(columns);
    } catch (err) {
        console.error('DB Error:', err);
        return { data: null, error: err };
    }
}

async function dbInsert(table, data) {
    if (!supabaseReady || !supabaseClient) {
        showToast('Database not ready. Please wait...', 'error');
        return { data: null, error: new Error('Not connected') };
    }
    try {
        return await supabaseClient.from(table).insert(data);
    } catch (err) {
        console.error('DB Error:', err);
        return { data: null, error: err };
    }
}

async function dbUpdate(table, data, column, value) {
    if (!supabaseReady || !supabaseClient) {
        showToast('Database not ready. Please wait...', 'error');
        return { data: null, error: new Error('Not connected') };
    }
    try {
        return await supabaseClient.from(table).update(data).eq(column, value);
    } catch (err) {
        console.error('DB Error:', err);
        return { data: null, error: err };
    }
}

async function dbDelete(table, column, value) {
    if (!supabaseReady || !supabaseClient) {
        showToast('Database not ready. Please wait...', 'error');
        return { data: null, error: new Error('Not connected') };
    }
    try {
        return await supabaseClient.from(table).delete().eq(column, value);
    } catch (err) {
        console.error('DB Error:', err);
        return { data: null, error: err };
    }
}

// ===== DATA LOADING =====
async function loadAllData() {
    showToast('Loading data...', '');
    await Promise.all([
        loadVegetables(),
        loadFarmers(),
        loadBuyers(),
        loadRetailStock(),
        loadRetailSales(),
        loadWholesaleBatches(),
        loadWholesaleSales(),
        loadWasteRecords(),
        loadExpenses()
    ]);
    loadDashboard();
    showToast('Data loaded!', 'success');
}

async function loadVegetables() {
    const { data, error } = await dbSelect('vegetables', '*');
    if (error) { console.error('Vegetables error:', error); return; }
    vegetables = (data || []).filter(v => v.is_active !== false);
    renderVegetables();
}

async function loadFarmers() {
    const { data, error } = await dbSelect('farmers', '*');
    if (error) { console.error('Farmers error:', error); return; }
    farmers = (data || []).filter(f => f.is_active !== false);
    renderFarmers();
}

async function loadBuyers() {
    const { data, error } = await dbSelect('buyers', '*');
    if (error) { console.error('Buyers error:', error); return; }
    buyers = (data || []).filter(b => b.is_active !== false);
    renderBuyers();
}

async function loadRetailStock() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await dbSelect('retail_stock', '*, vegetables(name, unit)');
    if (error) { console.error('Stock error:', error); return; }
    retailStock = (data || []).filter(s => s.is_active !== false && s.date === today);
    renderRetailStock();
}

async function loadRetailSales() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await dbSelect('retail_sales', '*, vegetables(name, unit)');
    if (error) { console.error('Sales error:', error); return; }
    retailSales = (data || []).filter(s => s.sale_date && s.sale_date.startsWith(today));
    renderRetailSales();
}

async function loadWholesaleBatches() {
    const { data, error } = await dbSelect('wholesale_batches', '*, vegetables(name, unit), farmers(name)');
    if (error) { console.error('Batches error:', error); return; }
    wholesaleBatches = data || [];
    renderWholesaleBatches();
}

async function loadWholesaleSales() {
    const { data, error } = await dbSelect('wholesale_sales', '*, vegetables(name, unit), buyers(business_name)');
    if (error) { console.error('WSales error:', error); return; }
    wholesaleSales = data || [];
    renderWholesaleSales();
}

async function loadWasteRecords() {
    const { data, error } = await dbSelect('waste_records', '*, vegetables(name, unit)');
    if (error) { console.error('Waste error:', error); return; }
    wasteRecords = data || [];
    renderWasteRecords();
}

async function loadExpenses() {
    const { data, error } = await dbSelect('shop_expenses', '*');
    if (error) { console.error('Expenses error:', error); return; }
    expenses = data || [];
    renderExpenses();
}

// ===== DASHBOARD =====
function loadDashboard() {
    const stockCount = retailStock.length;
    const stockEl = document.getElementById('retail-stock-count');
    if (stockEl) stockEl.textContent = stockCount + ' items';
    
    const batchCount = wholesaleBatches.filter(b => b.status === 'in_stock' || b.status === 'partially_sold').length;
    const batchEl = document.getElementById('batch-count');
    if (batchEl) batchEl.textContent = batchCount + ' batches';
    
    const todaySales = retailSales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
    const salesEl = document.getElementById('today-sales');
    if (salesEl) salesEl.textContent = formatMoney(todaySales);
    
    const lowStock = retailStock.filter(s => parseFloat(s.quantity_kg) <= parseFloat(s.min_stock_alert)).length;
    const lowEl = document.getElementById('low-stock-count');
    if (lowEl) lowEl.textContent = lowStock + ' items';
}

// ===== RENDER FUNCTIONS =====
function renderVegetables() {
    const container = document.getElementById('vegetables-list');
    if (!container) return;
    if (vegetables.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🥬</div><p>कुनै तरकारी छैन<br>No vegetables added yet</p></div>';
        return;
    }
    container.innerHTML = vegetables.map(v => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${v.name}</h4>
                <p>${v.category || 'No category'} • ${formatMoney(v.retail_price_per_unit)}/${v.unit}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn edit" onclick="editVegetable('${v.id}')">✏️</button>
                <button class="icon-btn delete" onclick="deleteVegetable('${v.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderFarmers() {
    const container = document.getElementById('farmers-list');
    if (!container) return;
    if (farmers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👨‍🌾</div><p>कुनै किसान छैन<br>No farmers added yet</p></div>';
        return;
    }
    container.innerHTML = farmers.map(f => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${f.name}</h4>
                <p>${f.village_area || 'No location'} • बाँकी: ${formatMoney(f.payment_due || 0)}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn edit" onclick="editFarmer('${f.id}')">✏️</button>
                <button class="icon-btn delete" onclick="deleteFarmer('${f.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderBuyers() {
    const container = document.getElementById('buyers-list');
    if (!container) return;
    if (buyers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏢</div><p>कुनै खरिदकर्ता छैन<br>No buyers added yet</p></div>';
        return;
    }
    container.innerHTML = buyers.map(b => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${b.business_name}</h4>
                <p>${b.buyer_type || 'Buyer'} • बाँकी: ${formatMoney(b.amount_due || 0)}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn edit" onclick="editBuyer('${b.id}')">✏️</button>
                <button class="icon-btn delete" onclick="deleteBuyer('${b.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderRetailStock() {
    const container = document.getElementById('retail-stock-list');
    if (!container) return;
    if (retailStock.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏪</div><p>आजको लागि कुनै माल छैन<br>No stock for today</p></div>';
        return;
    }
    container.innerHTML = retailStock.map(s => `
        <div class="list-item ${parseFloat(s.quantity_kg) <= parseFloat(s.min_stock_alert) ? 'low-stock' : ''}">
            <div class="list-item-info">
                <h4>${s.vegetables?.name || 'Unknown'}</h4>
                <p>${s.quantity_kg} ${s.vegetables?.unit || 'kg'} • ${formatMoney(s.selling_price_per_kg)}/${s.vegetables?.unit || 'kg'}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn edit" onclick="editStock('${s.id}')">✏️</button>
                <button class="icon-btn delete" onclick="deleteStock('${s.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderRetailSales() {
    const container = document.getElementById('retail-sales-list');
    if (!container) return;
    if (retailSales.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><p>आज कुनै बिक्री छैन<br>No sales today</p></div>';
        return;
    }
    container.innerHTML = retailSales.map(s => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${s.vegetables?.name || 'Unknown'}</h4>
                <p>${s.quantity_sold_kg} ${s.vegetables?.unit || 'kg'} • ${formatMoney(s.total_amount)} • ${s.payment_method}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn delete" onclick="deleteRetailSale('${s.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderWholesaleBatches() {
    const container = document.getElementById('wholesale-batches-list');
    if (!container) return;
    if (wholesaleBatches.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚚</div><p>कुनै ब्याच छैन<br>No batches yet</p></div>';
        return;
    }
    container.innerHTML = wholesaleBatches.map(b => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${b.vegetables?.name || 'Unknown'} (${b.quality_grade || 'N/A'})</h4>
                <p>${b.quantity_kg}kg from ${b.farmers?.name || 'Unknown'} • ${formatMoney(b.total_purchase_cost)} • ${b.status}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn edit" onclick="editBatch('${b.id}')">✏️</button>
            </div>
        </div>
    `).join('');
}

function renderWholesaleSales() {
    const container = document.getElementById('wholesale-sales-list');
    if (!container) return;
    if (wholesaleSales.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><p>कुनै थोक बिक्री छैन<br>No wholesale sales yet</p></div>';
        return;
    }
    container.innerHTML = wholesaleSales.map(s => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${s.vegetables?.name || 'Unknown'} → ${s.buyers?.business_name || 'Unknown'}</h4>
                <p>${s.quantity_sold_kg}kg • ${formatMoney(s.total_amount)} • ${s.payment_status}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn edit" onclick="editWholesaleSale('${s.id}')">✏️</button>
            </div>
        </div>
    `).join('');
}

function renderWasteRecords() {
    const container = document.getElementById('waste-list');
    if (!container) return;
    if (wasteRecords.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📉</div><p>कुनै बर्बादी रेकर्ड छैन<br>No waste recorded</p></div>';
        return;
    }
    container.innerHTML = wasteRecords.map(w => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${w.vegetables?.name || 'Unknown'}</h4>
                <p>${w.quantity_wasted_kg}kg • ${formatMoney(w.total_loss)} • ${w.reason}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn delete" onclick="deleteWaste('${w.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderExpenses() {
    const container = document.getElementById('expenses-list');
    if (!container) return;
    if (expenses.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><p>कुनै खर्च रेकर्ड छैन<br>No expenses recorded</p></div>';
        return;
    }
    container.innerHTML = expenses.map(e => `
        <div class="list-item">
            <div class="list-item-info">
                <h4>${e.expense_type}</h4>
                <p>${formatMoney(e.amount)} • ${e.expense_date} • ${e.payment_method}</p>
            </div>
            <div class="list-item-actions">
                <button class="icon-btn delete" onclick="deleteExpense('${e.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ===== ADD FORMS =====
function showAddVegetableForm() {
    const content = `
        <h3>🥬 नयाँ तरकारी थप्नुहोस्</h3>
        <div class="form-group">
            <label>नाम / Name</label>
            <input type="text" id="veg-name" placeholder="जस्तै: गोलभेडा">
        </div>
        <div class="form-group">
            <label>वर्ग / Category</label>
            <select id="veg-category">
                <option value="Leafy">पातेदार / Leafy</option>
                <option value="Root">जरा / Root</option>
                <option value="Fruit-Veg">फल-तरकारी / Fruit-Veg</option>
                <option value="Gourd">लौका / Gourd</option>
                <option value="Others">अन्य / Others</option>
            </select>
        </div>
        <div class="form-group">
            <label>इकाई / Unit</label>
            <select id="veg-unit">
                <option value="kg">किलो (kg)</option>
                <option value="piece">पिस (piece)</option>
                <option value="bunch">गुच्छा (bunch)</option>
                <option value="dozen">दर्जन (dozen)</option>
            </select>
        </div>
        <div class="form-group">
            <label>खुद्रा मूल्य प्रति इकाई / Retail Price (रू)</label>
            <input type="number" id="veg-price" placeholder="जस्तै: 40" step="0.01">
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addVegetable()">Save / सुरक्षित गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

function showAddFarmerForm() {
    const content = `
        <h3>👨‍🌾 नयाँ किसान थप्नुहोस्</h3>
        <div class="form-group">
            <label>नाम / Name</label>
            <input type="text" id="farmer-name" placeholder="जस्तै: राम सिंह">
        </div>
        <div class="form-group">
            <label>फोन / Phone</label>
            <input type="text" id="farmer-phone" placeholder="जस्तै: 98XXXXXXXX">
        </div>
        <div class="form-group">
            <label>ठेगाना / Address</label>
            <input type="text" id="farmer-address" placeholder="पूरा ठेगाना">
        </div>
        <div class="form-group">
            <label>गाउँ/क्षेत्र / Village/Area</label>
            <input type="text" id="farmer-village" placeholder="जस्तै: रामपुर">
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addFarmer()">Save / सुरक्षित गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

function showAddBuyerForm() {
    const content = `
        <h3>🏢 नयाँ खरिदकर्ता थप्नुहोस्</h3>
        <div class="form-group">
            <label>व्यवसायको नाम / Business Name</label>
            <input type="text" id="buyer-name" placeholder="जस्तै: ग्रीन होटल">
        </div>
        <div class="form-group">
            <label>सम्पर्क व्यक्ति / Contact Person</label>
            <input type="text" id="buyer-contact" placeholder="जस्तै: शर्मा जी">
        </div>
        <div class="form-group">
            <label>फोन / Phone</label>
            <input type="text" id="buyer-phone" placeholder="जस्तै: 98XXXXXXXX">
        </div>
        <div class="form-group">
            <label>खरिदकर्ताको प्रकार / Buyer Type</label>
            <select id="buyer-type">
                <option value="Restaurant">रेस्टुरेन्ट / Restaurant</option>
                <option value="Hotel">होटल / Hotel</option>
                <option value="Reseller">पुनर्विक्रेता / Reseller</option>
                <option value="Market">बजार विक्रेता / Market Vendor</option>
                <option value="Other">अन्य / Other</option>
            </select>
        </div>
        <div class="form-group">
            <label>क्रेडिट सीमा / Credit Limit (रू)</label>
            <input type="number" id="buyer-credit" placeholder="जस्तै: 50000" step="0.01">
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addBuyer()">Save / सुरक्षित गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

function showAddStockForm() {
    const vegOptions = vegetables.map(v => `<option value="${v.id}">${v.name} (${v.unit})</option>`).join('');
    const batchOptions = wholesaleBatches.filter(b => b.status !== 'sold_out').map(b => 
        `<option value="${b.id}">${b.vegetables?.name || 'Unknown'} - ${b.quantity_kg}kg (${b.quality_grade || 'N/A'})</option>`
    ).join('');
    
    const content = `
        <h3>🏪 पसलमा माल थप्नुहोस्</h3>
        <div class="form-group">
            <label>तरकारी छान्नुहोस् / Select Vegetable</label>
            <select id="stock-vegetable">${vegOptions}</select>
        </div>
        <div class="form-group">
            <label>ब्याचबाट (वैकल्पिक) / From Batch (Optional)</label>
            <select id="stock-batch"><option value="">-- ब्याच छान्नुहोस् --</option>${batchOptions}</select>
        </div>
        <div class="form-group">
            <label>परिमाण (kg/इकाई) / Quantity</label>
            <input type="number" id="stock-quantity" placeholder="जस्तै: 50" step="0.01">
        </div>
        <div class="form-group">
            <label>बिक्री मूल्य प्रति इकाई / Selling Price (रू)</label>
            <input type="number" id="stock-price" placeholder="जस्तै: 45" step="0.01">
        </div>
        <div class="form-group">
            <label>न्यूनतम स्टक अलर्ट / Min Stock Alert</label>
            <input type="number" id="stock-alert" value="5" step="0.01">
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addStock()">Save / सुरक्षित गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

function showAddSaleForm() {
    if (retailStock.length === 0) {
        showToast('पहिले माल थप्नुहोस्! Add stock first!', 'error');
        return;
    }
    const stockOptions = retailStock.map(s => 
        `<option value="${s.id}" data-veg="${s.vegetable_id}" data-price="${s.selling_price_per_kg}" data-unit="${s.vegetables?.unit || 'kg'}">
            ${s.vegetables?.name || 'Unknown'} - ${s.quantity_kg} ${s.vegetables?.unit || 'kg'} उपलब्ध
        </option>`
    ).join('');
    
    const content = `
        <h3>💰 नयाँ खुद्रा बिक्री</h3>
        <div class="form-group">
            <label>माल छान्नुहोस् / Select Stock</label>
            <select id="sale-stock" onchange="updateSalePrice()">${stockOptions}</select>
        </div>
        <div class="form-group">
            <label>बिक्री परिमाण / Quantity Sold</label>
            <input type="number" id="sale-quantity" placeholder="जस्तै: 2.5" step="0.01" oninput="calculateSaleTotal()">
        </div>
        <div class="form-group">
            <label>मूल्य प्रति इकाई / Price (रू)</label>
            <input type="number" id="sale-price" placeholder="Auto-filled" step="0.01" oninput="calculateSaleTotal()">
        </div>
        <div class="form-group">
            <label>कुल रकम / Total (रू)</label>
            <input type="number" id="sale-total" placeholder="Auto-calculated" step="0.01" readonly>
        </div>
        <div class="form-group">
            <label>भुक्तानी विधि / Payment Method</label>
            <select id="sale-payment">
                <option value="cash">नगद / Cash</option>
                <option value="upi">UPI/QR</option>
                <option value="credit">उधारो / Credit</option>
            </select>
        </div>
        <div class="form-group">
            <label>ग्राहकको नाम (वैकल्पिक) / Customer Name</label>
            <input type="text" id="sale-customer" placeholder="नियमित ग्राहक">
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addRetailSale()">Save Sale / बिक्री सुरक्षित गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

function showAddBatchForm() {
    if (vegetables.length === 0) { showToast('पहिले तरकारी थप्नुहोस्! Add vegetables first!', 'error'); return; }
    if (farmers.length === 0) { showToast('पहिले किसान थप्नुहोस्! Add farmers first!', 'error'); return; }
    
    const vegOptions = vegetables.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    const farmerOptions = farmers.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
    
    const content = `
        <h3>🚚 नयाँ थोक ब्याच</h3>
        <div class="form-group">
            <label>तरकारी / Vegetable</label>
            <select id="batch-vegetable">${vegOptions}</select>
        </div>
        <div class="form-group">
            <label>किसान / Farmer</label>
            <select id="batch-farmer">${farmerOptions}</select>
        </div>
        <div class="form-group">
            <label>परिमाण (kg) / Quantity</label>
            <input type="number" id="batch-quantity" placeholder="जस्तै: 100" step="0.01" oninput="calculateBatchTotal()">
        </div>
        <div class="form-group">
            <label>खरिद मूल्य प्रति kg (रू) / Purchase Price</label>
            <input type="number" id="batch-price" placeholder="जस्तै: 15" step="0.01" oninput="calculateBatchTotal()">
        </div>
        <div class="form-group">
            <label>यातायात खर्च (रू) / Transport Cost</label>
            <input type="number" id="batch-transport" value="0" step="0.01" oninput="calculateBatchTotal()">
        </div>
        <div class="form-group">
            <label>कुल खरिद लागत (रू) / Total Cost</label>
            <input type="number" id="batch-total" placeholder="Auto-calculated" step="0.01" readonly>
        </div>
        <div class="form-group">
            <label>गुणस्तर / Quality Grade</label>
            <select id="batch-grade">
                <option value="A">A - उत्कृष्ट / Premium</option>
                <option value="B">B - राम्रो / Good</option>
                <option value="C">C - सामान्य / Average</option>
            </select>
        </div>
        <div class="form-group">
            <label>टिप्पणी / Notes</label>
            <textarea id="batch-notes" placeholder="यस ब्याचको बारेमा कुनै टिप्पणी"></textarea>
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addBatch()">Save / सुरक्षित गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

function showAddWholesaleSaleForm() {
    const batchOptions = wholesaleBatches.filter(b => b.status !== 'sold_out').map(b => 
        `<option value="${b.id}" data-veg="${b.vegetable_id}" data-qty="${b.quantity_kg}" data-price="${b.purchase_price_per_kg}">
            ${b.vegetables?.name || 'Unknown'} - ${b.quantity_kg}kg उपलब्ध (${b.quality_grade || 'N/A'})
        </option>`
    ).join('');
    
    if (batchOptions === '') { showToast('कुनै ब्याच उपलब्ध छैन! No batches available!', 'error'); return; }
    if (buyers.length === 0) { showToast('पहिले खरिदकर्ता थप्नुहोस्! Add buyers first!', 'error'); return; }
    
    const buyerOptions = buyers.map(b => `<option value="${b.id}">${b.business_name}</option>`).join('');
    
    const content = `
        <h3>💰 नयाँ थोक बिक्री</h3>
        <div class="form-group">
            <label>ब्याच छान्नुहोस् / Select Batch</label>
            <select id="wsale-batch" onchange="updateWsaleDetails()">${batchOptions}</select>
        </div>
        <div class="form-group">
            <label>खरिदकर्ता / Buyer</label>
            <select id="wsale-buyer">${buyerOptions}</select>
        </div>
        <div class="form-group">
            <label>बिक्री परिमाण (kg) / Quantity</label>
            <input type="number" id="wsale-quantity" placeholder="जस्तै: 50" step="0.01" oninput="calculateWsaleTotal()">
        </div>
        <div class="form-group">
            <label>बिक्री मूल्य प्रति kg (रू) / Selling Price</label>
            <input type="number" id="wsale-price" placeholder="जस्तै: 25" step="0.01" oninput="calculateWsaleTotal()">
        </div>
        <div class="form-group">
            <label>कुल रकम (रू) / Total Amount</label>
            <input type="number" id="wsale-total" placeholder="Auto-calculated" step="0.01" readonly>
        </div>
        <div class="form-group">
            <label>भुक्तानी स्थिति / Payment Status</label>
            <select id="wsale-payment">
                <option value="pending">बाँकी / Pending</option>
                <option value="paid">भुक्तान गरिएको / Paid</option>
                <option value="partial">आंशिक / Partial</option>
            </select>
        </div>
        <div class="form-group">
            <label>भुक्तान गरिएको (रू) / Amount Paid</label>
            <input type="number" id="wsale-paid" value="0" step="0.01">
        </div>
        <div class="form-group">
            <label>डेलिभरी मिति / Delivery Date</label>
            <input type="date" id="wsale-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addWholesaleSale()">Save Sale / बिक्री सुरक्षित गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

function showAddWasteForm() {
    if (vegetables.length === 0) { showToast('पहिले तरकारी थप्नुहोस्! Add vegetables first!', 'error'); return; }
    
    const vegOptions = vegetables.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    const content = `
        <h3>📉 बर्बादी रेकर्ड गर्नुहोस्</h3>
        <div class="form-group">
            <label>तरकारी / Vegetable</label>
            <select id="waste-vegetable">${vegOptions}</select>
        </div>
        <div class="form-group">
            <label>बर्बाद परिमाण (kg) / Quantity Wasted</label>
            <input type="number" id="waste-quantity" placeholder="जस्तै: 5" step="0.01" oninput="calculateWasteLoss()">
        </div>
        <div class="form-group">
            <label>लागत मूल्य प्रति kg (रू) / Cost Price</label>
            <input type="number" id="waste-cost" placeholder="जस्तै: 15" step="0.01" oninput="calculateWasteLoss()">
        </div>
        <div class="form-group">
            <label>कुल घाटा (रू) / Total Loss</label>
            <input type="number" id="waste-total" placeholder="Auto-calculated" step="0.01" readonly>
        </div>
        <div class="form-group">
            <label>कारण / Reason</label>
            <select id="waste-reason">
                <option value="spoiled">कुहिएको / Spoiled</option>
                <option value="damaged">क्षतिग्रस्त / Damaged</option>
                <option value="expired">म्याद सकिएको / Expired</option>
                <option value="unsold">नबिकेको / Unsold</option>
            </select>
        </div>
        <div class="form-group">
            <label>टिप्पणी / Notes</label>
            <textarea id="waste-notes" placeholder="थप विवरण"></textarea>
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addWaste()">Record / रेकर्ड गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

function showAddExpenseForm() {
    const content = `
        <h3>💰 पसल खर्च थप्नुहोस्</h3>
        <div class="form-group">
            <label>खर्चको प्रकार / Expense Type</label>
            <select id="expense-type">
                <option value="rent">पसल भाडा / Shop Rent</option>
                <option value="electricity">बिजुली / Electricity</option>
                <option value="labor">मजदुरी / Labor</option>
                <option value="transport">यातायात / Transport</option>
                <option value="packing">प्याकिङ / Packing</option>
                <option value="other">अन्य / Other</option>
            </select>
        </div>
        <div class="form-group">
            <label>रकम (रू) / Amount</label>
            <input type="number" id="expense-amount" placeholder="जस्तै: 5000" step="0.01">
        </div>
        <div class="form-group">
            <label>विवरण / Description</label>
            <input type="text" id="expense-desc" placeholder="जस्तै: मासिक पसल भाडा">
        </div>
        <div class="form-group">
            <label>मिति / Date</label>
            <input type="date" id="expense-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
            <label>भुक्तानी विधि / Payment Method</label>
            <select id="expense-payment">
                <option value="cash">नगद / Cash</option>
                <option value="bank_transfer">बैंक ट्रान्सफर / Bank Transfer</option>
                <option value="upi">UPI/QR</option>
            </select>
        </div>
        <div class="form-group">
            <label>मासिक दोहोरिने? / Monthly Recurring?</label>
            <select id="expense-recurring">
                <option value="false">होइन / No</option>
                <option value="true">हो / Yes</option>
            </select>
        </div>
        <div class="form-actions">
            <button class="btn-submit" onclick="addExpense()">Save / सुरक्षित गर्नुहोस्</button>
            <button class="btn-cancel" onclick="closeModal()">Cancel / रद्द गर्नुहोस्</button>
        </div>
    `;
    openModal(content);
}

// ===== CALCULATION HELPERS =====
function updateSalePrice() {
    const select = document.getElementById('sale-stock');
    if (!select) return;
    const option = select.options[select.selectedIndex];
    if (option && document.getElementById('sale-price')) {
        document.getElementById('sale-price').value = option.dataset.price || '';
    }
    calculateSaleTotal();
}

function calculateSaleTotal() {
    const qty = parseFloat(document.getElementById('sale-quantity')?.value) || 0;
    const price = parseFloat(document.getElementById('sale-price')?.value) || 0;
    const total = document.getElementById('sale-total');
    if (total) total.value = (qty * price).toFixed(2);
}

function calculateBatchTotal() {
    const qty = parseFloat(document.getElementById('batch-quantity')?.value) || 0;
    const price = parseFloat(document.getElementById('batch-price')?.value) || 0;
    const transport = parseFloat(document.getElementById('batch-transport')?.value) || 0;
    const total = document.getElementById('batch-total');
    if (total) total.value = ((qty * price) + transport).toFixed(2);
}

function updateWsaleDetails() {
    const select = document.getElementById('wsale-batch');
    if (!select) return;
    const option = select.options[select.selectedIndex];
    if (option && document.getElementById('wsale-price')) {
        const purchasePrice = parseFloat(option.dataset.price) || 0;
        document.getElementById('wsale-price').value = (purchasePrice * 1.2).toFixed(2);
    }
    calculateWsaleTotal();
}

function calculateWsaleTotal() {
    const qty = parseFloat(document.getElementById('wsale-quantity')?.value) || 0;
    const price = parseFloat(document.getElementById('wsale-price')?.value) || 0;
    const total = document.getElementById('wsale-total');
    if (total) total.value = (qty * price).toFixed(2);
}

function calculateWasteLoss() {
    const qty = parseFloat(document.getElementById('waste-quantity')?.value) || 0;
    const cost = parseFloat(document.getElementById('waste-cost')?.value) || 0;
    const total = document.getElementById('waste-total');
    if (total) total.value = (qty * cost).toFixed(2);
}

// ===== SAVE FUNCTIONS =====
async function addVegetable() {
    const name = document.getElementById('veg-name').value.trim();
    const category = document.getElementById('veg-category').value;
    const unit = document.getElementById('veg-unit').value;
    const price = parseFloat(document.getElementById('veg-price').value) || 0;
    
    if (!name) { showToast('कृपया तरकारीको नाम हाल्नुहोस्!', 'error'); return; }
    
    const { error } = await dbInsert('vegetables', [{ name, category, unit, retail_price_per_unit: price }]);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    
    showToast('तरकारी थपियो! Vegetable added!', 'success');
    closeModal();
    loadVegetables();
}

async function addFarmer() {
    const name = document.getElementById('farmer-name').value.trim();
    const phone = document.getElementById('farmer-phone').value.trim();
    const address = document.getElementById('farmer-address').value.trim();
    const village = document.getElementById('farmer-village').value.trim();
    
    if (!name) { showToast('कृपया किसानको नाम हाल्नुहोस्!', 'error'); return; }
    
    const { error } = await dbInsert('farmers', [{ name, phone, address, village_area: village }]);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    
    showToast('किसान थपियो! Farmer added!', 'success');
    closeModal();
    loadFarmers();
}

async function addBuyer() {
    const businessName = document.getElementById('buyer-name').value.trim();
    const contact = document.getElementById('buyer-contact').value.trim();
    const phone = document.getElementById('buyer-phone').value.trim();
    const type = document.getElementById('buyer-type').value;
    const credit = parseFloat(document.getElementById('buyer-credit').value) || 0;
    
    if (!businessName) { showToast('कृपया व्यवसायको नाम हाल्नुहोस्!', 'error'); return; }
    
    const { error } = await dbInsert('buyers', [{ 
        business_name: businessName, 
        contact_person: contact, 
        phone, 
        buyer_type: type, 
        credit_limit: credit 
    }]);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    
    showToast('खरिदकर्ता थपियो! Buyer added!', 'success');
    closeModal();
    loadBuyers();
}

async function addStock() {
    const vegId = document.getElementById('stock-vegetable').value;
    const batchId = document.getElementById('stock-batch').value || null;
    const quantity = parseFloat(document.getElementById('stock-quantity').value) || 0;
    const price = parseFloat(document.getElementById('stock-price').value) || 0;
    const alert = parseFloat(document.getElementById('stock-alert').value) || 5;
    
    if (!quantity) { showToast('कृपया परिमाण हाल्नुहोस्!', 'error'); return; }
    
    const { error } = await dbInsert('retail_stock', [{ 
        vegetable_id: vegId, 
        batch_id: batchId || null, 
        quantity_kg: quantity, 
        selling_price_per_kg: price, 
        min_stock_alert: alert,
        date: new Date().toISOString().split('T')[0]
    }]);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    
    showToast('माल थपियो! Stock added!', 'success');
    closeModal();
    loadRetailStock();
}

async function addRetailSale() {
    const stockId = document.getElementById('sale-stock').value;
    const select = document.getElementById('sale-stock');
    const option = select.options[select.selectedIndex];
    const vegId = option.dataset.veg;
    const quantity = parseFloat(document.getElementById('sale-quantity').value) || 0;
    const price = parseFloat(document.getElementById('sale-price').value) || 0;
    const total = parseFloat(document.getElementById('sale-total').value) || 0;
    const payment = document.getElementById('sale-payment').value;
    const customer = document.getElementById('sale-customer').value.trim();
    
    if (!quantity) { showToast('कृपया बिक्री परिमाण हाल्नुहोस्!', 'error'); return; }
    
    const stockItem = retailStock.find(s => s.id === stockId);
    if (stockItem && parseFloat(stockItem.quantity_kg) < quantity) {
        showToast('पर्याप्त माल छैन! Available: ' + stockItem.quantity_kg, 'error');
        return;
    }
    
    const { error: saleError } = await dbInsert('retail_sales', [{ 
        retail_stock_id: stockId,
        vegetable_id: vegId,
        quantity_sold_kg: quantity,
        price_per_kg: price,
        total_amount: total,
        payment_method: payment,
        customer_name: customer || null
    }]);
    if (saleError) { showToast('Error: ' + saleError.message, 'error'); return; }
    
    if (stockItem) {
        const newQty = parseFloat(stockItem.quantity_kg) - quantity;
        await dbUpdate('retail_stock', { quantity_kg: newQty }, 'id', stockId);
    }
    
    showToast('बिक्री रेकर्ड गरियो! ₹' + total, 'success');
    closeModal();
    loadRetailStock();
    loadRetailSales();
    loadDashboard();
}

async function addBatch() {
    const vegId = document.getElementById('batch-vegetable').value;
    const farmerId = document.getElementById('batch-farmer').value;
    const quantity = parseFloat(document.getElementById('batch-quantity').value) || 0;
    const price = parseFloat(document.getElementById('batch-price').value) || 0;
    const transport = parseFloat(document.getElementById('batch-transport').value) || 0;
    const total = parseFloat(document.getElementById('batch-total').value) || 0;
    const grade = document.getElementById('batch-grade').value;
    const notes = document.getElementById('batch-notes').value.trim();
    
    if (!quantity || !price) { showToast('कृपया सबै आवश्यक फिल्ड भर्नुहोस्!', 'error'); return; }
    
    const { error } = await dbInsert('wholesale_batches', [{ 
        vegetable_id: vegId,
        farmer_id: farmerId,
        quantity_kg: quantity,
        purchase_price_per_kg: price,
        transport_cost: transport,
        total_purchase_cost: total,
        quality_grade: grade,
        notes: notes || null
    }]);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    
    showToast('ब्याच थपियो! Batch added!', 'success');
    closeModal();
    loadWholesaleBatches();
}

async function addWholesaleSale() {
    const batchId = document.getElementById('wsale-batch').value;
    const buyerId = document.getElementById('wsale-buyer').value;
    const quantity = parseFloat(document.getElementById('wsale-quantity').value) || 0;
    const price = parseFloat(document.getElementById('wsale-price').value) || 0;
    const total = parseFloat(document.getElementById('wsale-total').value) || 0;
    const paymentStatus = document.getElementById('wsale-payment').value;
    const amountPaid = parseFloat(document.getElementById('wsale-paid').value) || 0;
    const deliveryDate = document.getElementById('wsale-date').value;
    
    const select = document.getElementById('wsale-batch');
    const option = select.options[select.selectedIndex];
    const vegId = option.dataset.veg;
    
    if (!quantity) { showToast('कृपया परिमाण हाल्नुहोस्!', 'error'); return; }
    
    const { error } = await dbInsert('wholesale_sales', [{ 
        batch_id: batchId,
        buyer_id: buyerId,
        vegetable_id: vegId,
        quantity_sold_kg: quantity,
        selling_price_per_kg: price,
        total_amount: total,
        payment_status: paymentStatus,
        amount_paid: amountPaid,
        delivery_date: deliveryDate
    }]);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    
    if (paymentStatus === 'pending' || paymentStatus === 'partial') {
        const due = total - amountPaid;
        const buyer = buyers.find(b => b.id === buyerId);
        if (buyer) {
            await dbUpdate('buyers', { amount_due: (parseFloat(buyer.amount_due) || 0) + due }, 'id', buyerId);
        }
    }
    
    showToast('थोक बिक्री रेकर्ड गरियो! ₹' + total, 'success');
    closeModal();
    loadWholesaleSales();
    loadBuyers();
}

async function addWaste() {
    const vegId = document.getElementById('waste-vegetable').value;
    const quantity = parseFloat(document.getElementById('waste-quantity').value) || 0;
    const cost = parseFloat(document.getElementById('waste-cost').value) || 0;
    const total = parseFloat(document.getElementById('waste-total').value) || 0;
    const reason = document.getElementById('waste-reason').value;
    const notes = document.getElementById('waste-notes').value.trim();
    
    if (!quantity) { showToast('कृपया परिमाण हाल्नुहोस्!', 'error'); return; }
    
    const { error } = await dbInsert('waste_records', [{ 
        vegetable_id: vegId,
        quantity_wasted_kg: quantity,
        reason,
        cost_price_per_kg: cost,
        total_loss: total,
        notes: notes || null
    }]);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    
    showToast('बर्बादी रेकर्ड गरियो!', 'success');
    closeModal();
    loadWasteRecords();
}

async function addExpense() {
    const type = document.getElementById('expense-type').value;
    const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
    const desc = document.getElementById('expense-desc').value.trim();
    const date = document.getElementById('expense-date').value;
    const payment = document.getElementById('expense-payment').value;
    const recurring = document.getElementById('expense-recurring').value === 'true';
    
    if (!amount) { showToast('कृपया रकम हाल्नुहोस्!', 'error'); return; }
    
    const { error } = await dbInsert('shop_expenses', [{ 
        expense_type: type,
        amount,
        description: desc || null,
        expense_date: date,
        payment_method: payment,
        is_recurring: recurring
    }]);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    
    showToast('खर्च रेकर्ड गरियो!', 'success');
    closeModal();
    loadExpenses();
}

// ===== DELETE FUNCTIONS =====
async function deleteVegetable(id) {
    if (!confirm('यो तरकारी हटाउने? Delete this vegetable?')) return;
    const { error } = await dbUpdate('vegetables', { is_active: false }, 'id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('हटाइयो! Deleted!', 'success');
    loadVegetables();
}

async function deleteFarmer(id) {
    if (!confirm('यो किसान हटाउने? Delete this farmer?')) return;
    const { error } = await dbUpdate('farmers', { is_active: false }, 'id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('हटाइयो! Deleted!', 'success');
    loadFarmers();
}

async function deleteBuyer(id) {
    if (!confirm('यो खरिदकर्ता हटाउने? Delete this buyer?')) return;
    const { error } = await dbUpdate('buyers', { is_active: false }, 'id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('हटाइयो! Deleted!', 'success');
    loadBuyers();
}

async function deleteStock(id) {
    if (!confirm('यो माल हटाउने? Remove this stock?')) return;
    const { error } = await dbUpdate('retail_stock', { is_active: false }, 'id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('हटाइयो! Removed!', 'success');
    loadRetailStock();
}

async function deleteRetailSale(id) {
    if (!confirm('यो बिक्री रेकर्ड हटाउने? Delete this sale?')) return;
    const { error } = await dbDelete('retail_sales', 'id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('हटाइयो! Deleted!', 'success');
    loadRetailSales();
}

async function deleteWaste(id) {
    if (!confirm('यो बर्बादी रेकर्ड हटाउने? Delete this waste record?')) return;
    const { error } = await dbDelete('waste_records', 'id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('हटाइयो! Deleted!', 'success');
    loadWasteRecords();
}

async function deleteExpense(id) {
    if (!confirm('यो खर्च हटाउने? Delete this expense?')) return;
    const { error } = await dbDelete('shop_expenses', 'id', id);
    if (error) { showToast('Error: ' + error.message, 'error'); return; }
    showToast('
