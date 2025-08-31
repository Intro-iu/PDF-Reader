async function getOpenAICompletion(userPrompt, systemPrompt, apiEndpoint, apiKey, modelId, onChunk, onComplete) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    const isStreaming = typeof onChunk === 'function';

    const body = JSON.stringify({
        model: modelId,
        messages: messages,
        stream: isStreaming
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

        if (isStreaming) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (typeof onComplete === 'function') {
                        onComplete(fullContent);
                    }
                    break;
                }
                
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.substring(6);
                        if (dataStr.trim() === '[DONE]') {
                            if (typeof onComplete === 'function') {
                                onComplete(fullContent);
                            }
                            return;
                        }
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                const content = data.choices[0].delta.content;
                                fullContent += content;
                                onChunk(content);
                            }
                        } catch (e) {
                            console.error("Error parsing stream data:", e);
                        }
                    }
                }
            }
        } else {
            const data = await response.json();
            return data.choices[0].message.content;
        }
    } catch (error) {
        console.error('Error fetching OpenAI completion:', error);
        throw error;
    }
}