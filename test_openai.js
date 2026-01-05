try {
    const OpenAI = require('openai');
    console.log('✅ OpenAI module loaded successfully');
} catch (err) {
    console.error('❌ Failed to load OpenAI:', err.message);
}
