// MailMaster - AI-Powered Email Assistant
// Main JavaScript functionality

class MailMaster {
    constructor() {
        this.currentEmail = '';
        this.selectedTone = 'professional';
        this.researchData = null;
        this.apiKeys = {
            openai: '',
            tavily: ''
        };
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.validateApiKeys();
    }

    setupEventListeners() {
        // Tone selector event listeners
        document.querySelectorAll('.tone-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const parent = e.target.closest('.tone-selector');
                parent.querySelectorAll('.tone-option').forEach(opt => opt.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedTone = e.target.dataset.tone;
            });
        });

        // Form submissions
        document.getElementById('email-form').addEventListener('submit', (e) => this.generateEmail(e));
        document.getElementById('reply-form').addEventListener('submit', (e) => this.generateReply(e));
        document.getElementById('research-form').addEventListener('submit', (e) => this.performResearch(e));
    }

    loadSettings() {
        // Load saved settings from localStorage
        const saved = localStorage.getItem('mailmaster_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            document.getElementById('signature').value = settings.signature || 'Best regards,\n[Your Name]';
            document.getElementById('sender-name').value = settings.senderName || '';
            document.getElementById('auto-followup').checked = settings.autoFollowup !== false;
            document.getElementById('spam-filter').checked = settings.spamFilter !== false;
            document.getElementById('smart-context').checked = settings.smartContext !== false;
        }

        // Load API keys
        const savedKeys = localStorage.getItem('mailmaster_keys');
        if (savedKeys) {
            const keys = JSON.parse(savedKeys);
            this.apiKeys = { ...this.apiKeys, ...keys };
        }
    }

    validateApiKeys() {
        const statusElement = document.getElementById('api-status');
        if (this.apiKeys.openai && this.apiKeys.tavily) {
            statusElement.textContent = '✅ Keys Configured';
            statusElement.style.color = '#28a745';
        } else {
            statusElement.textContent = '❌ Please configure API keys';
            statusElement.style.color = '#dc3545';
        }
    }

    // OpenAI API Integration
    async callOpenAI(prompt, maxTokens = 1000) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKeys.openai}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are MailMaster, an expert email writing assistant. Generate professional, contextually appropriate emails based on the user\'s requirements. Always maintain the specified tone and include all key points naturally.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw new Error('Failed to generate content with OpenAI. Please check your API key and connection.');
        }
    }

    // Tavily AI Integration
    async callTavily(query, searchDepth = 'advanced') {
        try {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKeys.tavily}`
                },
                body: JSON.stringify({
                    query: query,
                    search_depth: searchDepth,
                    include_answer: true,
                    include_raw_content: false,
                    max_results: 5,
                    include_domains: [],
                    exclude_domains: []
                })
            });

            if (!response.ok) {
                throw new Error(`Tavily API error: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Tavily API Error:', error);
            throw new Error('Failed to perform research with Tavily AI. Please check your API key and connection.');
        }
    }

    // Sentiment Analysis using OpenAI
    async analyzeSentimentWithAI(text) {
        try {
            const prompt = `Analyze the sentiment and tone of the following email. Provide:
1. Overall sentiment (positive, negative, neutral)
2. Emotional tone
3. Urgency level (high, medium, low)
4. Recommended response tone
5. Key points to address

Email to analyze:
"${text}"

Please format your response as JSON with the following structure:
{
    "sentiment": "positive/negative/neutral",
    "emotion": "description of emotional tone",
    "urgency": "high/medium/low",
    "recommended_tone": "suggested response tone",
    "key_points": ["point1", "point2", "point3"],
    "priority_score": 1-10
}`;

            const result = await this.callOpenAI(prompt, 500);
            return JSON.parse(result);
        } catch (error) {
            console.error('Sentiment analysis error:', error);
            // Fallback to simple analysis
            return this.simpleSentimentAnalysis(text);
        }
    }

    simpleSentimentAnalysis(text) {
        const positiveWords = ['thank', 'please', 'appreciate', 'great', 'excellent', 'wonderful', 'happy'];
        const negativeWords = ['urgent', 'problem', 'issue', 'error', 'complaint', 'disappointed', 'frustrated'];
        
        const words = text.toLowerCase().split(/\s+/);
        let positiveCount = 0;
        let negativeCount = 0;

        words.forEach(word => {
            if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
            if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
        });

        let sentiment = 'neutral';
        if (positiveCount > negativeCount) sentiment = 'positive';
        else if (negativeCount > positiveCount) sentiment = 'negative';

        return {
            sentiment,
            emotion: sentiment === 'positive' ? 'friendly' : sentiment === 'negative' ? 'concerned' : 'neutral',
            urgency: negativeWords.some(word => text.toLowerCase().includes(word)) ? 'high' : 'medium',
            recommended_tone: sentiment === 'negative' ? 'empathetic' : 'professional',
            key_points: ['Address main concerns', 'Provide clear information', 'Maintain professional tone'],
            priority_score: sentiment === 'negative' ? 8 : 5
        };
    }

    // Generate Email with AI
    async generateEmail(e) {
        e.preventDefault();
        
        if (!this.apiKeys.openai) {
            this.showNotification('Please configure your OpenAI API key in Settings', 'error');
            return;
        }

        const subject = document.getElementById('subject').value;
        const recipient = document.getElementById('recipient').value;
        const keyPoints = document.getElementById('key-points').value;
        const context = document.getElementById('context').value;
        const language = document.getElementById('language').value;
        const signature = document.getElementById('signature').value;
        const senderName = document.getElementById('sender-name').value;
        const autoResearch = document.getElementById('auto-research').checked;

        this.showLoading();

        try {
            let researchContext = '';
            
            // Perform automatic research if enabled
            if (autoResearch && context) {
                try {
                    const researchQuery = `${subject} ${context}`.substring(0, 100);
                    const researchResult = await this.callTavily(researchQuery, 'basic');
                    if (researchResult.answer) {
                        researchContext = `\n\nAdditional Context from Research:\n${researchResult.answer}`;
                        this.displayResearchContext(researchResult);
                    }
                } catch (researchError) {
                    console.warn('Research failed, continuing without it:', researchError);
                }
            }

            // Create comprehensive prompt for email generation
            const prompt = `Generate a professional email with the following details:

Subject: ${subject}
Recipient: ${recipient}
Tone: ${this.selectedTone}
Language: ${language}
Sender: ${senderName || '[Your Name]'}

Key Points to Include:
${keyPoints}

Additional Context:
${context}${researchContext}

Requirements:
- Use a ${this.selectedTone} tone throughout
- Include all key points naturally in the email body
- Make it contextually appropriate for the recipient
- End with the signature: ${signature}
- Write in ${language === 'en' ? 'English' : this.getLanguageName(language)}
- Format as a complete email with subject line

Please generate a well-structured, professional email that addresses all the points effectively.`;

            const generatedEmail = await this.callOpenAI(prompt, 800);
            
            this.currentEmail = generatedEmail;
            this.displayEmail(generatedEmail);
            this.hideLoading();
            this.showNotification('Email generated successfully!', 'success');

        } catch (error) {
            console.error('Email generation error:', error);
            this.hideLoading();
            this.showNotification(error.message, 'error');
            this.displayError('Failed to generate email. Please check your API configuration and try again.');
        }
    }

    // Generate Reply with AI
    async generateReply(e) {
        e.preventDefault();
        
        if (!this.apiKeys.openai) {
            this.showNotification('Please configure your OpenAI API key in Settings', 'error');
            return;
        }

        const originalEmail = document.getElementById('original-email').value;
        const replyPoints = document.getElementById('reply-points').value;
        const replyTone = document.querySelector('#reply-tone-selector .tone-option.selected').dataset.tone;
        const signature = document.getElementById('signature').value;
        const senderName = document.getElementById('sender-name').value;

        this.showLoading();

        try {
            // First, analyze the sentiment of the original email
            const sentimentAnalysis = await this.analyzeSentimentWithAI(originalEmail);
            
            // Generate appropriate reply based on sentiment and user requirements
            const prompt = `Generate a professional email reply based on the following:

Original Email:
"${originalEmail}"

Sentiment Analysis Results:
- Detected sentiment: ${sentimentAnalysis.sentiment}
- Emotional tone: ${sentimentAnalysis.emotion}
- Urgency level: ${sentimentAnalysis.urgency}
- Priority score: ${sentimentAnalysis.priority_score}/10

Reply Requirements:
- Tone: ${replyTone}
- Additional points to include: ${replyPoints || 'None specified'}
- Sender: ${senderName || '[Your Name]'}

Key Points to Address:
${sentimentAnalysis.key_points.join('\n')}

Please generate a ${replyTone} reply that:
1. Acknowledges the original message appropriately
2. Addresses the sentiment and concerns raised
3. Includes any additional points specified
4. Maintains a ${replyTone} tone throughout
5. Ends with: ${signature}

Format as a complete email with subject line (Re: [original subject]).`;

            const generatedReply = await this.callOpenAI(prompt, 600);
            
            this.currentEmail = generatedReply;
            this.displayEmail(generatedReply, sentimentAnalysis);
            this.hideLoading();
            this.showNotification('Reply generated successfully!', 'success');

        } catch (error) {
            console.error('Reply generation error:', error);
            this.hideLoading();
            this.showNotification(error.message, 'error');
            this.displayError('Failed to generate reply. Please check your API configuration and try again.');
        }
    }

    // Perform Research with Tavily AI
    async performResearch(e) {
        e.preventDefault();
        
        if (!this.apiKeys.tavily) {
            this.showNotification('Please configure your Tavily API key in Settings', 'error');
            return;
        }

        const query = document.getElementById('research-query').value;
        const depth = document.getElementById('research-depth').value;

        this.showLoading();

        try {
            const researchResult = await this.callTavily(query, depth);
            this.researchData = researchResult;
            this.displayResearchResults(researchResult);
            this.hideLoading();
            this.showNotification('Research completed successfully!', 'success');

        } catch (error) {
            console.error('Research error:', error);
            this.hideLoading();
            this.showNotification(error.message, 'error');
            this.displayError('Failed to perform research. Please check your Tavily API configuration and try again.');
        }
    }

    // Analyze sentiment of original email
    async analyzeSentiment() {
        const originalEmail = document.getElementById('original-email').value;
        
        if (!originalEmail) {
            this.showNotification('Please paste an email to analyze', 'error');
            return;
        }

        if (!this.apiKeys.openai) {
            this.showNotification('Please configure your OpenAI API key for sentiment analysis', 'error');
            return;
        }

        this.showLoading();

        try {
            const analysis = await this.analyzeSentimentWithAI(originalEmail);
            this.displaySentimentAnalysis(analysis);
            this.hideLoading();
            this.showNotification('Sentiment analysis complete!', 'success');

        } catch (error) {
            console.error('Sentiment analysis error:', error);
            this.hideLoading();
            this.showNotification('Failed to analyze sentiment', 'error');
        }
    }

    // Display functions
    displayEmail(email, sentimentData = null) {
        const outputContent = document.getElementById('output-content');
        const priority = sentimentData ? this.getPriorityClass(sentimentData.priority_score) : 'medium';
        
        outputContent.innerHTML = `
            <div class="email-preview">
                <div class="email-header">
                    <div class="email-field">
                        <strong>Priority:</strong> 
                        <span class="priority-indicator priority-${priority}"></span>
                        ${priority.charAt(0).toUpperCase() + priority.slice(1)}
                        ${sentimentData ? `(Score: ${sentimentData.priority_score}/10)` : ''}
                    </div>
                    ${sentimentData ? `
                    <div class="email-field">
                        <strong>Detected Sentiment:</strong>
                        <span class="sentiment-indicator sentiment-${sentimentData.sentiment}">
                            ${sentimentData.sentiment.toUpperCase()}
                        </span>
                    </div>` : ''}
                </div>
                <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${email}</pre>
            </div>
        `;
        document.getElementById('output-actions').style.display = 'flex';
    }

    displaySentimentAnalysis(analysis) {
        const sentimentResult = document.getElementById('sentiment-result');
        const sentimentText = document.getElementById('sentiment-text');
        
        sentimentText.innerHTML = `
            <div class="email-field">
                <strong>Overall Sentiment:</strong>
                <span class="sentiment-indicator sentiment-${analysis.sentiment}">
                    ${analysis.sentiment.toUpperCase()}
                </span>
            </div>
            <div class="email-field">
                <strong>Emotional Tone:</strong> ${analysis.emotion}
            </div>
            <div class="email-field">
                <strong>Urgency Level:</strong> 
                <span class="priority-indicator priority-${analysis.urgency === 'high' ? 'high' : analysis.urgency === 'low' ? 'low' : 'medium'}"></span>
                ${analysis.urgency.toUpperCase()}
            </div>
            <div class="email-field">
                <strong>Priority Score:</strong> ${analysis.priority_score}/10
            </div>
            <div class="email-field">
                <strong>Recommended Response Tone:</strong> ${analysis.recommended_tone}
            </div>
            <div class="email-field">
                <strong>Key Points to Address:</strong>
                <ul style="margin-top: 8px; margin-left: 20px;">
                    ${analysis.key_points.map(point => `<li>${point}</li>`).join('')}
                </ul>
            </div>
        `;
        
        sentimentResult.style.display = 'block';
    }

    displayResearchResults(results) {
        const container = document.getElementById('research-results-container');
        
        let html = `
            <div class="research-results">
                <h5>🔍 Research Summary</h5>
                <p><strong>Query:</strong> ${results.query}</p>
                ${results.answer ? `<p><strong>Answer:</strong> ${results.answer}</p>` : ''}
            </div>
        `;

        if (results.results && results.results.length > 0) {
            html += '<h5 style="margin-top: 20px; color: #2a5298;">📚 Sources:</h5>';
            results.results.forEach((result, index) => {
                html += `
                    <div class="research-results">
                        <h6 style="color: #2a5298; margin-bottom: 5px;">
                            ${index + 1}. ${result.title}
                        </h6>
                        <p style="font-size: 13px; color: #666; margin-bottom: 8px;">
                            <a href="${result.url}" target="_blank" style="color: #2a5298;">${result.url}</a>
                        </p>
                        <p>${result.content}</p>
                    </div>
                `;
            });
        }

        container.innerHTML = html;
    }

    displayResearchContext(results) {
        const contextDiv = document.getElementById('research-context');
        const contextContent = document.getElementById('research-context-content');
        
        contextContent.innerHTML = `
            <div class="research-results">
                <h5>🧠 AI Research Context Applied</h5>
                <p>${results.answer}</p>
                <small style="color: #666;">This context was automatically integrated into your email generation.</small>
            </div>
        `;
        
        contextDiv.style.display = 'block';
    }

    displayError(message) {
        const outputContent = document.getElementById('output-content');
        outputContent.innerHTML = `
            <div class="error-message">
                <h4>⚠️ Error</h4>
                <p>${message}</p>
            </div>
        `;
    }

    // Utility functions
    getPriorityClass(score) {
        if (score >= 8) return 'high';
        if (score >= 5) return 'medium';
        return 'low';
    }

    getLanguageName(code) {
        const languages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'zh': 'Chinese',
            'ja': 'Japanese'
        };
        return languages[code] || 'English';
    }

    showLoading() {
        document.getElementById('loading').classList.add('active');
        document.getElementById('output-content').style.display = 'none';
        document.getElementById('output-actions').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').classList.remove('active');
        document.getElementById('output-content').style.display = 'block';
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    // Action functions
    copyToClipboard() {
        navigator.clipboard.writeText(this.currentEmail).then(() => {
            this.showNotification('Email copied to clipboard!', 'success');
        }).catch(err => {
            this.showNotification('Failed to copy email', 'error');
        });
    }

    openEmailClient() {
        // Extract subject from the email
        const lines = this.currentEmail.split('\n');
        const subjectLine = lines.find(line => line.startsWith('Subject:'));
        const subject = subjectLine ? subjectLine.replace('Subject:', '').trim() : 'Generated Email';
        
        // Create mailto link
        const recipient = document.getElementById('recipient').value || '';
        const body = encodeURIComponent(this.currentEmail);
        const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${body}`;
        
        window.open(mailtoLink);
        this.showNotification('Email client opened!', 'success');
    }

    regenerate() {
        const activeTab = document.querySelector('.tab.active').textContent.toLowerCase();
        if (activeTab === 'compose') {
            this.generateEmail({ preventDefault: () => {} });
        } else if (activeTab === 'reply') {
            this.generateReply({ preventDefault: () => {} });
        }
    }

    clearForm() {
        document.getElementById('email-form').reset();
        document.querySelectorAll('.tone-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector('.tone-option[data-tone="professional"]').classList.add('selected');
        this.selectedTone = 'professional';
        document.getElementById('research-context').style.display = 'none';
    }

    clearResearch() {
        document.getElementById('research-form').reset();
        document.getElementById('research-results-container').innerHTML = '';
    }

    saveApiKeys() {
        this.apiKeys.openai = document.getElementById('openai-key').value;
        this.apiKeys.tavily = document.getElementById('tavily-key').value;
        localStorage.setItem('mailmaster_keys', JSON.stringify(this.apiKeys));
        this.validateApiKeys();
        this.showNotification('API keys saved successfully!', 'success');
    }

    saveSettings() {
        const settings = {
            signature: document.getElementById('signature').value,
            senderName: document.getElementById('sender-name').value,
            autoFollowup: document.getElementById('auto-followup').checked,
            spamFilter: document.getElementById('spam-filter').checked,
            smartContext: document.getElementById('smart-context').checked
        };
        localStorage.setItem('mailmaster_settings', JSON.stringify(settings));
        this.showNotification('Settings saved successfully!', 'success');
    }
}

// Tab switching function
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Global functions for button handlers
function clearForm() {
    window.mailMaster.clearForm();
}

function clearResearch() {
    window.mailMaster.clearResearch();
}

function analyzeSentiment() {
    window.mailMaster.analyzeSentiment();
}

function copyToClipboard() {
    window.mailMaster.copyToClipboard();
}

function openEmailClient() {
    window.mailMaster.openEmailClient();
}

function regenerate() {
    window.mailMaster.regenerate();
}

function saveApiKeys() {
    window.mailMaster.saveApiKeys();
}

function saveSettings() {
    window.mailMaster.saveSettings();
}

// Initialize MailMaster when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.mailMaster = new MailMaster();
});
