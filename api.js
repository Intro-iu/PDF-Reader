async function getOpenAICompletion(userPrompt, systemPrompt, apiEndpoint, apiKey, modelId) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const body = JSON.stringify({
        model: modelId,
        messages: messages
    });

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            let error_message = `API request failed with status ${response.status}`;
            try {
                const errorData = await response.json();
                error_message = errorData.error?.message || JSON.stringify(errorData);
            } catch (e) {
                error_message = await response.text();
            }
            throw new Error(error_message);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error fetching OpenAI completion:', error);
        throw error;
    }
}