document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('json-file-input');
    const outputDiv = document.getElementById('conversations-output');

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];

        if (!file) {
            outputDiv.innerHTML = '<p>No file selected.</p>';
            return;
        }

        // Check file extension
        if (!file.name.endsWith('.json')) {
            outputDiv.innerHTML = '<p class="error-message">Please select a .json file.</p>';
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);

                if (!Array.isArray(jsonContent)) {
                    outputDiv.innerHTML = '<p class="error-message">Invalid JSON structure. Expected an array of conversations.</p>';
                    return;
                }

                displayConversations(jsonContent);

            } catch (error) {
                outputDiv.innerHTML = `<p class="error-message">Error parsing JSON file: ${error.message}</p>`;
                console.error("Error parsing JSON:", error);
            }
        };

        reader.onerror = () => {
            outputDiv.innerHTML = `<p class="error-message">Error reading file: ${reader.error.message}</p>`;
            console.error("Error reading file:", reader.error);
        };

        reader.readAsText(file);
    });

    function displayConversations(conversations) {
        outputDiv.innerHTML = ''; // Clear previous content

        if (conversations.length === 0) {
            outputDiv.innerHTML = '<p>No conversations found in the file.</p>';
            return;
        }

        conversations.forEach(conv => {
            const convDiv = document.createElement('div');
            convDiv.classList.add('conversation-item');

            const title = conv.title || 'Untitled Conversation';
            // ChatGPT export `create_time` is a Unix timestamp in seconds
            const createTime = conv.create_time ? new Date(conv.create_time * 1000).toLocaleString() : 'N/A'; 

            const titleElem = document.createElement('h3');
            titleElem.textContent = title;

            const timeElem = document.createElement('p');
            timeElem.textContent = `Created: ${createTime}`;

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('conversation-actions');

            const viewButton = document.createElement('button');
            viewButton.classList.add('view-btn');
            viewButton.innerHTML = '👁️ View'; // Eye icon
            viewButton.title = 'View Conversation';

            const downloadButton = document.createElement('button');
            downloadButton.classList.add('download-btn');
            downloadButton.innerHTML = '💾 Download'; // Disk icon
            downloadButton.title = 'Download Conversation';

            actionsDiv.appendChild(viewButton);
            actionsDiv.appendChild(downloadButton);

            const conversationContentDiv = document.createElement('div');
            conversationContentDiv.classList.add('conversation-content');
            conversationContentDiv.style.display = 'none'; // Initially hidden

            viewButton.addEventListener('click', () => {
                // Toggle visibility
                const isHidden = conversationContentDiv.style.display === 'none';
                conversationContentDiv.style.display = isHidden ? 'block' : 'none';

                if (isHidden && conversationContentDiv.children.length === 0) {
                    // Populate content only if hidden and not already populated
                    const messages = getConversationMessages(conv);
                    if (messages.length === 0) {
                        conversationContentDiv.innerHTML = '<p>No messages found for this conversation.</p>';
                    } else {
                        messages.forEach(msg => {
                            const msgDiv = document.createElement('div');
                            msgDiv.classList.add('message-item');
                            msgDiv.classList.add(msg.role === 'user' ? 'user-message' : 'assistant-message');

                            const roleElem = document.createElement('strong');
                            roleElem.textContent = `${msg.role}: `;

                            const contentElem = document.createElement('p');
                            contentElem.textContent = msg.content;

                            msgDiv.appendChild(roleElem);
                            msgDiv.appendChild(contentElem);
                            conversationContentDiv.appendChild(msgDiv);
                        });
                    }
                }
            });

            downloadButton.addEventListener('click', () => {
                const convJson = JSON.stringify(conv, null, 2);
                const blob = new Blob([convJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                const fileName = `${sanitizeFilename(title)}_chatgpt_${new Date(conv.create_time * 1000).toISOString().slice(0, 10)}.json`;
                a.download = fileName;
                document.body.appendChild(a); // Append to body to make it clickable
                a.click();
                document.body.removeChild(a); // Clean up
                URL.revokeObjectURL(url); // Release the object URL
            });

            convDiv.appendChild(titleElem);
            convDiv.appendChild(timeElem);
            convDiv.appendChild(actionsDiv);
            convDiv.appendChild(conversationContentDiv);
            outputDiv.appendChild(convDiv);
        });
    }

    // Helper function to sanitize filenames
    function sanitizeFilename(filename) {
        return filename.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').substring(0, 100);
    }

    // Function to extract messages from the conversation object
    function getConversationMessages(conversation) {
        const messages = [];
        const mapping = conversation.mapping;
        const nodeMap = new Map();

        for (const key in mapping) {
            nodeMap.set(key, mapping[key]);
        }

        // Iterate through all nodes in the mapping
        for (const nodeId in mapping) {
            const node = mapping[nodeId];
            // Check if the node contains a message with content
            if (node.message && node.message.content && node.message.content.parts) {
                messages.push({
                    role: node.message.author.role,
                    content: node.message.content.parts.join('\n'), // Join parts if multiple
                    create_time: node.message.create_time, // Message has its own creation time
                    id: nodeId // Keep ID for potential future use or debugging
                });
            }
        }

        // Sort all extracted messages by their creation time to ensure chronological order
        messages.sort((a, b) => a.create_time - b.create_time);

        return messages;
    }
});
