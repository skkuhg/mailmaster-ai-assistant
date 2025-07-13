# Security Notice

## API Key Safety

⚠️ **IMPORTANT**: This application requires you to provide your own API keys for OpenAI and Tavily AI.

### Security Best Practices

1. **Never share your API keys**: Keep your keys private and secure
2. **Use environment variables**: For production deployments, use secure environment variable management
3. **Monitor usage**: Regularly check your API usage and billing on both platforms
4. **Rotate keys**: Periodically rotate your API keys for enhanced security
5. **Local storage**: Keys are stored in your browser's localStorage - they never leave your device

### Getting API Keys

#### OpenAI API Key
- Visit: https://platform.openai.com/api-keys
- Sign up/Login to your account
- Create a new API key
- Copy the key (starts with `sk-`)

#### Tavily AI API Key
- Visit: https://tavily.com/
- Create an account
- Access your dashboard to get API key
- Copy the key (starts with `tvly-`)

### How Keys Are Used

- **Storage**: Keys are stored locally in your browser's localStorage
- **Transmission**: Keys are only sent directly to OpenAI and Tavily APIs
- **Security**: No third-party servers have access to your keys
- **Privacy**: Your email content and research queries are processed by the respective AI services

### Responsible Usage

- Comply with OpenAI's usage policies
- Comply with Tavily AI's terms of service
- Use the application for legitimate business and personal email needs
- Be mindful of API rate limits and costs

### Support

If you have security concerns or questions:
1. Check the API providers' documentation
2. Review the open-source code in this repository
3. Create an issue in this repository for application-specific questions

---

🔒 **Your security and privacy are our top priorities**
