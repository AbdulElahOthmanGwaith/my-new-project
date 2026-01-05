/**
 * مترجم عربي - أمهري - تطبيق جافاسكريبت
 * Arabic Amharic Translator - JavaScript Application
 */

// ============================================
// التهيئة والمتغيرات العامة
// ============================================

const App = {
    // حالة التطبيق
    state: {
        sourceLang: 'ar',
        targetLang: 'am',
        sourceText: '',
        translatedText: '',
        isTranslating: false,
        isSpeaking: false,
        debounceTimer: null,
        history: []
    },

    // عناصر DOM
    elements: {},

    // تكوين الترجمة
    config: {
        debounceTime: 1500,
        debounceTimeLong: 3000,
        maxHistoryItems: 100,
        maxTextLength: 50000,
        longTextThreshold: 5000,
        apiEndpoints: {
            google: 'https://translate.googleapis.com/translate_a/single',
            libre: 'https://libretranslate.com/translate'
        }
    },

    // تهيئة التطبيق
    init() {
        this.cacheElements();
        this.loadTheme();
        this.loadHistory();
        this.bindEvents();
        this.setupServiceWorker();
        this.setupAutoResize();
        this.showToast('مرحباً! يمكنك الآن الترجمة من العربية إلى الأمهرية', 'success');
    },

    // تخزين عناصر DOM
    cacheElements() {
        this.elements = {
            // الرأس والثيم
            themeToggle: document.getElementById('theme-toggle'),
            loadingBar: document.getElementById('loading-bar'),

            // اللغات
            sourceLang: document.getElementById('source-lang'),
            targetLang: document.getElementById('target-lang'),
            swapBtn: document.getElementById('swap-languages'),
            sourceLabel: document.getElementById('source-label'),
            targetLabel: document.getElementById('target-label'),

            // النصوص
            sourceText: document.getElementById('source-text'),
            resultText: document.getElementById('result-text'),
            charCount: document.getElementById('char-count'),
            translateBtn: document.getElementById('translate-btn'),

            // الإجراءات
            sourceSpeech: document.getElementById('source-speech'),
            sourceClear: document.getElementById('source-clear'),
            targetSpeech: document.getElementById('target-speech'),
            targetCopy: document.getElementById('target-copy'),
            targetShare: document.getElementById('target-share'),

            // التحميل
            loadingSpinner: document.getElementById('loading-spinner'),

            // السجل
            historySection: document.getElementById('history-section'),
            historyList: document.getElementById('history-list'),
            emptyHistory: document.getElementById('empty-history'),
            clearHistory: document.getElementById('clear-history'),

            // الإشعارات
            toast: document.getElementById('toast'),

            // نافذة الخطأ
            errorModal: document.getElementById('error-modal'),
            errorMessage: document.getElementById('error-message'),
            closeModal: document.getElementById('close-modal')
        };
    },

    // ربط الأحداث
    bindEvents() {
        // تبديل الثيم
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // تبديل اللغات
        this.elements.swapBtn.addEventListener('click', () => this.swapLanguages());

        // تغيير اللغة
        this.elements.sourceLang.addEventListener('change', (e) => this.handleLanguageChange('source', e.target.value));
        this.elements.targetLang.addEventListener('change', (e) => this.handleLanguageChange('target', e.target.value));

        // إدخال النص
        this.elements.sourceText.addEventListener('input', (e) => this.handleInput(e));

        // زر الترجمة
        this.elements.translateBtn.addEventListener('click', () => this.translate());

        // مسح النص
        this.elements.sourceClear.addEventListener('click', () => this.clearSourceText());

        // النطق
        this.elements.sourceSpeech.addEventListener('click', () => this.speak('source'));
        this.elements.targetSpeech.addEventListener('click', () => this.speak('target'));

        // نسخ الترجمة
        this.elements.targetCopy.addEventListener('click', () => this.copyToClipboard());

        // مشاركة الترجمة
        this.elements.targetShare.addEventListener('click', () => this.shareTranslation());

        // مسح السجل
        this.elements.clearHistory.addEventListener('click', () => this.clearHistory());

        // إغلاق نافذة الخطأ
        this.elements.closeModal.addEventListener('click', () => this.hideErrorModal());
        this.elements.errorModal.addEventListener('click', (e) => {
            if (e.target === this.elements.errorModal) this.hideErrorModal();
        });

        // اختصار لوحة المفاتيح
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // اتصل بالترجمة عند الضغط على Enter مع Ctrl
        this.elements.sourceText.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.translate();
            }
        });
    },

    // ============================================
    // إدارة الثيم
    // ============================================

    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else if (systemPrefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        this.updateLoadingBar();
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateLoadingBar();
    },

    updateLoadingBar() {
        this.elements.loadingBar.classList.add('complete');
        setTimeout(() => {
            this.elements.loadingBar.classList.remove('active', 'complete');
        }, 500);
    },

    // ============================================
    // إدارة اللغات
    // ============================================

    handleLanguageChange(type, lang) {
        if (type === 'source') {
            this.state.sourceLang = lang;
            this.elements.sourceLabel.textContent = this.getLangName(lang);

            // تحديث اتجاه النص
            this.updateTextDirection(this.elements.sourceText, lang);

            // تحديث فئة الخط للنص الأمهري
            if (lang === 'am') {
                this.elements.sourceText.classList.add('amharic-text');
            } else {
                this.elements.sourceText.classList.remove('amharic-text');
            }
        } else {
            this.state.targetLang = lang;
            this.elements.targetLabel.textContent = this.getLangName(lang);

            // تحديث فئة الخط للنتيجة الأمهرية
            if (lang === 'am') {
                this.elements.resultText.classList.remove('arabic-result');
            } else {
                this.elements.resultText.classList.add('arabic-result');
            }
        }

        // إعادة الترجمة إذا كان هناك نص
        if (this.state.sourceText.trim()) {
            this.translate();
        }
    },

    swapLanguages() {
        const tempLang = this.state.sourceLang;
        const tempText = this.state.sourceText;

        // تبديل اللغات
        this.state.sourceLang = this.state.targetLang;
        this.state.targetLang = tempLang;

        // تحديث واجهة المستخدم
        this.elements.sourceLang.value = this.state.sourceLang;
        this.elements.targetLang.value = this.state.targetLang;
        this.elements.sourceLabel.textContent = this.getLangName(this.state.sourceLang);
        this.elements.targetLabel.textContent = this.getLangName(this.state.targetLang);

        // نقل النص
        this.state.sourceText = this.state.translatedText;
        this.elements.sourceText.value = this.state.sourceText;
        this.handleInput({ target: this.elements.sourceText });

        // تحديث الفئات
        if (this.state.sourceLang === 'am') {
            this.elements.sourceText.classList.add('amharic-text');
        } else {
            this.elements.sourceText.classList.remove('amharic-text');
        }

        if (this.state.targetLang !== 'am') {
            this.elements.resultText.classList.add('arabic-result');
        } else {
            this.elements.resultText.classList.remove('arabic-result');
        }

        // إعادة الترجمة
        if (this.state.sourceText.trim()) {
            this.translate();
        }

        // تأثير بصري
        this.animateSwap();
    },

    animateSwap() {
        this.elements.swapBtn.style.transform = 'rotate(180deg) scale(1.2)';
        setTimeout(() => {
            this.elements.swapBtn.style.transform = '';
        }, 300);
    },

    getLangName(code) {
        const names = {
            'ar': 'العربية',
            'am': 'الأمهرية',
            'en': 'الإنجليزية'
        };
        return names[code] || code;
    },

    updateTextDirection(element, lang) {
        element.dir = lang === 'ar' ? 'rtl' : 'ltr';
        element.style.textAlign = lang === 'ar' ? 'right' : 'left';
    },

    // ============================================
    // إدارة النص والإدخال
    // ============================================

    handleInput(e) {
        const text = e.target.value;
        this.state.sourceText = text;

        // تحديث الإحصائيات
        this.updateStats(text);

        // تفعيل/تعطيل زر الترجمة
        this.elements.translateBtn.disabled = !text.trim();

        // إزالة الترجمة القديمة
        if (!text.trim()) {
            this.elements.resultText.textContent = '';
            this.state.translatedText = '';
            return;
        }

        // تأخير الترجمة (Debounce) - أطول للنصوص الطويلة
        clearTimeout(this.state.debounceTimer);
        const debounceTime = text.length > this.config.longTextThreshold 
            ? this.config.debounceTimeLong 
            : this.config.debounceTime;
        this.state.debounceTimer = setTimeout(() => {
            this.translate();
        }, debounceTime);
    },

    updateStats(text) {
        // حساب الكلمات (فصل المسافات)
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;

        // حساب الأسطر (فصل السطر الجديد)
        const lines = text.split(/\n/).filter(line => line.trim().length > 0);
        const lineCount = Math.max(1, lines.length);

        // حساب الفقرات (فصل سطرين فارغين)
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const paragraphCount = Math.max(1, paragraphs.length);

        // حساب الأحرف
        const charCount = text.length;

        // حساب نسبة التقدم
        const progressPercent = Math.min(100, Math.round((charCount / this.config.maxTextLength) * 100));

        // تحديث العناصر
        document.getElementById('word-count').textContent = wordCount.toLocaleString();
        document.getElementById('sentence-count').textContent = lineCount.toLocaleString();
        document.getElementById('paragraph-count').textContent = paragraphCount.toLocaleString();
        document.getElementById('char-count').textContent = charCount.toLocaleString();
        
        // تحديث شريط التقدم
        const progressFill = document.getElementById('progress-fill');
        const progressPercentEl = document.getElementById('progress-percent');
        if (progressFill) {
            progressFill.style.width = progressPercent + '%';
        }
        if (progressPercentEl) {
            progressPercentEl.textContent = progressPercent + '%';
        }

        // تحديث ألوان التحذير
        this.updateStatWarning('word-stat', wordCount, 10000);
        this.updateStatWarning('sentence-stat', lineCount, 2000);
        this.updateStatWarning('paragraph-stat', paragraphCount, 500);
        this.updateStatWarning('char-stat', charCount, 50000);
        
        // تحديث شريط التقدم
        const progressStat = document.getElementById('progress-stat');
        if (progressStat) {
            progressStat.classList.remove('warning', 'danger');
            if (charCount >= this.config.maxTextLength) {
                progressStat.classList.add('danger');
            } else if (progressPercent >= 90) {
                progressStat.classList.add('warning');
            }
        }
    },

    updateStatWarning(elementId, value, limit) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.remove('warning', 'danger');

        if (value >= limit) {
            element.classList.add('danger');
        } else if (value >= limit * 0.9) {
            element.classList.add('warning');
        }
    },

    setupAutoResize() {
        const resizeTextarea = () => {
            this.elements.sourceText.style.height = 'auto';
            this.elements.sourceText.style.height = Math.max(120, this.elements.sourceText.scrollHeight) + 'px';
        };

        this.elements.sourceText.addEventListener('input', resizeTextarea);
    },

    clearSourceText() {
        this.elements.sourceText.value = '';
        this.elements.resultText.textContent = '';
        this.state.sourceText = '';
        this.state.translatedText = '';
        this.updateStats('');
        this.elements.translateBtn.disabled = true;
        this.elements.sourceText.focus();
    },

    // ============================================
    // الترجمة
    // ============================================

    async translate() {
        const text = this.state.sourceText.trim();

        if (!text) {
            this.showToast('الرجاء إدخال نص للترجمة', 'warning');
            return;
        }

        if (text.length > this.config.maxTextLength) {
            this.showError(`النص طويل جداً. الحد الأقصى هو ${this.config.maxTextLength.toLocaleString()} حرف`);
            return;
        }

        this.state.isTranslating = true;

        // رسالة تحميل مخصصة للنصوص الطويلة
        const loadingText = text.length > this.config.longTextThreshold 
            ? `جاري ترجمة ${(text.length / 1000).toFixed(1)}k حرف...` 
            : 'جاري الترجمة...';
        this.showLoading(loadingText);

        try {
            // محاولة الترجمة باستخدام Google Translate
            const result = await this.translateWithGoogle(text, this.state.sourceLang, this.state.targetLang);

            if (result) {
                this.state.translatedText = result;
                this.elements.resultText.textContent = result;
                this.addToHistory(text, result);
            } else {
                throw new Error('فشل في الحصول على الترجمة');
            }
        } catch (error) {
            console.error('Translation error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.state.isTranslating = false;
            this.hideLoading();
        }
    },

    async translateWithGoogle(text, sourceLang, targetLang) {
        try {
            // استخدام Google Translate API (مجاني جزئياً)
            const url = `${this.config.apiEndpoints.google}?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data && data[0]) {
                // استخراج النص المترجم
                let translatedText = '';
                data[0].forEach(item => {
                    if (item[0]) {
                        translatedText += item[0];
                    }
                });
                return translatedText.trim();
            }

            return null;
        } catch (error) {
            console.error('Google Translate error:', error);
            // محاولة استخدام ترجمة بديلة
            return this.translateWithLibre(text, sourceLang, targetLang);
        }
    },

    async translateWithLibre(text, sourceLang, targetLang) {
        try {
            const response = await fetch(this.config.apiEndpoints.libre + '/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text'
                })
            });

            if (!response.ok) {
                throw new Error('LibreTranslate request failed');
            }

            const data = await response.json();
            return data.translatedText;
        } catch (error) {
            console.error('LibreTranslate error:', error);
            throw error;
        }
    },

    // ============================================
    // النطق الصوتي
    // ============================================

    speak(type) {
        const text = type === 'source' ? this.state.sourceText : this.state.translatedText;
        const lang = type === 'source' ? this.state.sourceLang : this.state.targetLang;

        if (!text.trim()) {
            this.showToast('لا يوجد نص للنطق', 'warning');
            return;
        }

        // التحقق من دعم اللغة
        const supportedLangs = ['ar', 'en'];
        if (!supportedLangs.includes(lang)) {
            this.showToast('عذراً، النطق غير مدعوم لهذه اللغة حالياً', 'warning');
            return;
        }

        if (this.state.isSpeaking) {
            window.speechSynthesis.cancel();
            this.state.isSpeaking = false;
            this.updateSpeakingIndicator(type, false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        utterance.onstart = () => {
            this.state.isSpeaking = true;
            this.updateSpeakingIndicator(type, true);
        };

        utterance.onend = () => {
            this.state.isSpeaking = false;
            this.updateSpeakingIndicator(type, false);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.state.isSpeaking = false;
            this.updateSpeakingIndicator(type, false);
            this.showToast('حدث خطأ في النطق', 'error');
        };

        window.speechSynthesis.speak(utterance);
    },

    updateSpeakingIndicator(type, speaking) {
        const btn = type === 'source' ? this.elements.sourceSpeech : this.elements.targetSpeech;
        if (speaking) {
            btn.classList.add('speaking');
            btn.setAttribute('aria-label', 'إيقاف النطق');
        } else {
            btn.classList.remove('speaking');
            btn.setAttribute('aria-label', type === 'source' ? 'النطق' : 'النطق');
        }
    },

    // ============================================
    // النسخ والمشاركة
    // ============================================

    async copyToClipboard() {
        const text = this.state.translatedText;

        if (!text.trim()) {
            this.showToast('لا يوجد نص للنسخ', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('تم نسخ الترجمة بنجاح', 'success');
        } catch (error) {
            console.error('Copy error:', error);
            // طريقة بديلة للنسخ
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showToast('تم نسخ الترجمة بنجاح', 'success');
        }
    },

    async shareTranslation() {
        const text = this.state.translatedText;

        if (!text.trim()) {
            this.showToast('لا يوجد نص للمشاركة', 'warning');
            return;
        }

        const shareData = {
            title: 'مترجم عربي - أمهري',
            text: `الترجمة:\n${text}`,
            url: window.location.href
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                this.showToast('تم مشاركة الترجمة', 'success');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    this.copyToClipboard();
                }
            }
        } else {
            this.copyToClipboard();
        }
    },

    // ============================================
    // إدارة السجل
    // ============================================

    addToHistory(source, target) {
        const historyItem = {
            id: Date.now(),
            sourceLang: this.state.sourceLang,
            targetLang: this.state.targetLang,
            sourceText: source,
            targetText: target,
            timestamp: new Date().toISOString()
        };

        this.state.history.unshift(historyItem);

        // حذف العناصر الزائدة
        if (this.state.history.length > this.config.maxHistoryItems) {
            this.state.history = this.state.history.slice(0, this.config.maxHistoryItems);
        }

        this.saveHistory();
        this.renderHistory();
    },

    loadHistory() {
        try {
            const saved = localStorage.getItem('translationHistory');
            if (saved) {
                this.state.history = JSON.parse(saved);
                this.renderHistory();
            }
        } catch (error) {
            console.error('Error loading history:', error);
            this.state.history = [];
        }
    },

    saveHistory() {
        try {
            localStorage.setItem('translationHistory', JSON.stringify(this.state.history));
        } catch (error) {
            console.error('Error saving history:', error);
        }
    },

    renderHistory() {
        if (this.state.history.length === 0) {
            this.elements.historyList.innerHTML = '';
            this.elements.emptyHistory.classList.remove('hidden');
            return;
        }

        this.elements.emptyHistory.classList.add('hidden');

        this.elements.historyList.innerHTML = this.state.history.map(item => `
            <div class="history-item" data-id="${item.id}" onclick="App.loadFromHistory(${item.id})">
                <div class="history-header">
                    <span class="history-langs">${this.getLangName(item.sourceLang)} → ${this.getLangName(item.targetLang)}</span>
                    <span class="history-time">${this.formatTime(item.timestamp)}</span>
                </div>
                <div class="history-content">
                    <div class="history-source">${this.escapeHtml(item.sourceText)}</div>
                    <div class="history-target">${this.escapeHtml(item.targetText)}</div>
                </div>
            </div>
        `).join('');
    },

    loadFromHistory(id) {
        const item = this.state.history.find(h => h.id === id);
        if (!item) return;

        // تعيين اللغات
        this.state.sourceLang = item.sourceLang;
        this.state.targetLang = item.targetLang;

        this.elements.sourceLang.value = item.sourceLang;
        this.elements.targetLang.value = item.targetLang;

        this.elements.sourceLabel.textContent = this.getLangName(item.sourceLang);
        this.elements.targetLabel.textContent = this.getLangName(item.targetLang);

        // تعيين النص
        this.state.sourceText = item.sourceText;
        this.state.translatedText = item.targetText;

        this.elements.sourceText.value = item.sourceText;
        this.elements.resultText.textContent = item.targetText;
        this.updateStats(item.sourceText);

        // تفعيل زر الترجمة
        this.elements.translateBtn.disabled = false;

        // تحديث الفئات
        if (item.sourceLang === 'am') {
            this.elements.sourceText.classList.add('amharic-text');
        } else {
            this.elements.sourceText.classList.remove('amharic-text');
        }

        // التمرير للأعلى
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    clearHistory() {
        if (this.state.history.length === 0) return;

        if (confirm('هل أنت متأكد من مسح جميع الترجمات؟')) {
            this.state.history = [];
            this.saveHistory();
            this.renderHistory();
            this.showToast('تم مسح السجل بنجاح', 'success');
        }
    },

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) {
            return 'الآن';
        } else if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `منذ ${minutes} دقيقة`;
        } else if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `منذ ${hours} ساعة`;
        } else {
            return date.toLocaleDateString('ar-SA');
        }
    },

    // ============================================
    // تحميل وإخفاء التحميل
    // ============================================

    showLoading(message = null) {
        this.elements.loadingSpinner.classList.add('active');
        this.elements.resultText.style.display = 'none';
        
        if (message) {
            const spinnerText = this.elements.loadingSpinner.querySelector('span');
            if (spinnerText) {
                spinnerText.textContent = message;
            }
        }
    },

    hideLoading() {
        this.elements.loadingSpinner.classList.remove('active');
        this.elements.resultText.style.display = 'block';
        
        // إعادة تعيين نص التحميل
        const spinnerText = this.elements.loadingSpinner.querySelector('span');
        if (spinnerText) {
            spinnerText.textContent = 'جاري الترجمة...';
        }
    },

    // ============================================
    // الإشعارات والأخطاء
    // ============================================

    showToast(message, type = 'info') {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.className = 'toast ' + type;

        // إظهار الإشعار
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // إخفاء الإشعار بعد 3 ثوانٍ
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorModal.classList.add('active');
    },

    hideErrorModal() {
        this.elements.errorModal.classList.remove('active');
    },

    getErrorMessage(error) {
        if (!navigator.onLine) {
            return 'يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى';
        }

        if (error.message.includes('Network') || error.name === 'TypeError') {
            return 'حدث خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى';
        }

        if (error.message.includes('429')) {
            return 'تم تجاوز حد الطلبات. يرجى الانتظار قليلاً والمحاولة مرة أخرى';
        }

        return 'حدث خطأ أثناء الترجمة. يرجى المحاولة مرة أخرى';
    },

    // ============================================
    // اختصارات لوحة المفاتيح
    // ============================================

    handleKeyboardShortcuts(e) {
        // Ctrl + Enter للترجمة
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            this.translate();
        }

        // Ctrl + D لمسح النص
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            this.clearSourceText();
        }

        // Escape لإخفاء النافذة
        if (e.key === 'Escape') {
            this.hideErrorModal();
        }
    },

    // ============================================
    // خدمة PWA
    // ============================================

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/my-new-project/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registered:', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        }
    },

    // ============================================
    // أدوات مساعدة
    // ============================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// تصدير للاستخدام العام
window.App = App;
