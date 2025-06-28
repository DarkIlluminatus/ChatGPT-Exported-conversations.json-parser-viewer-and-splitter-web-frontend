import { saveAs } from 'https://cdn.skypack.dev/file-saver';
import JSZip from 'https://cdn.skypack.dev/jszip';

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('json-file-input');
    const outputDiv = document.getElementById('conversations-output');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const downloadAllTextBtn = document.getElementById('download-all-text-btn'); // New element

    let allConversations = []; // Store conversations globally once loaded

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];

        if (!file) {
            outputDiv.innerHTML = '<p>No file selected.</p>';
            downloadAllBtn.disabled = true;
            downloadAllTextBtn.disabled = true; // Disable new button
            return;
        }

        // Check file extension
        if (!file.name.endsWith('.json')) {
            outputDiv.innerHTML = '<p class="error-message">Please select a .json file.</p>';
            downloadAllBtn.disabled = true;
            downloadAllTextBtn.disabled = true; // Disable new button
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);

                if (!Array.isArray(jsonContent)) {
                    outputDiv.innerHTML = '<p class="error-message">Invalid JSON structure. Expected an array of conversations.</p>';
                    downloadAllBtn.disabled = true;
                    downloadAllTextBtn.disabled = true; // Disable new button
                    return;
                }

                allConversations = jsonContent; // Store the loaded conversations
                displayConversations(allConversations);
                downloadAllBtn.disabled = allConversations.length === 0; // Enable if conversations exist
                downloadAllTextBtn.disabled = allConversations.length === 0; // Enable new button

            } catch (error) {
                outputDiv.innerHTML = `<p class="error-message">Error parsing JSON file: ${error.message}</p>`;
                console.error("Error parsing JSON:", error);
                downloadAllBtn.disabled = true;
                downloadAllTextBtn.disabled = true; // Disable new button
            }
        };

        reader.onerror = () => {
            outputDiv.innerHTML = `<p class="error-message">Error reading file: ${reader.error.message}</p>`;
            console.error("Error reading file:", reader.error);
            downloadAllBtn.disabled = true;
            downloadAllTextBtn.disabled = true; // Disable new button
        };

        reader.readAsText(file);
    });

    downloadAllBtn.addEventListener('click', async () => {
        if (allConversations.length === 0) {
            alert("No conversations to download. Please load a JSON file first.");
            return;
        }

        downloadAllBtn.disabled = true;
        const originalText = downloadAllBtn.textContent;
        downloadAllBtn.textContent = 'Zipping JSON...';

        const zip = new JSZip();
        let fileCount = 0;

        allConversations.forEach(conv => {
            try {
                const title = conv.title || 'Untitled Conversation';
                const createTime = conv.create_time ? new Date(conv.create_time * 1000).toISOString().slice(0, 10) : 'N/A';
                const fileName = `${sanitizeFilename(title)}_chatgpt_${createTime}.json`;
                const convJson = JSON.stringify(conv, null, 2);
                zip.file(fileName, convJson);
                fileCount++;
            } catch (error) {
                console.error(`Error processing conversation ${conv.title}:`, error);
            }
        });

        if (fileCount === 0) {
            outputDiv.insertAdjacentHTML('afterbegin', '<p class="error-message">No valid conversations found to zip.</p>');
            downloadAllBtn.textContent = originalText;
            downloadAllBtn.disabled = false;
            return;
        }

        try {
            const content = await zip.generateAsync({ type: "blob" });
            const zipFileName = `all_chatgpt_conversations_${new Date().toISOString().slice(0, 10)}.zip`;
            saveAs(content, zipFileName);
        } catch (error) {
            outputDiv.insertAdjacentHTML('afterbegin', `<p class="error-message">Error generating ZIP file: ${error.message}</p>`);
            console.error("Error generating ZIP:", error);
        } finally {
            downloadAllBtn.textContent = originalText;
            downloadAllBtn.disabled = false;
        }
    });

    // New event listener for downloading all as plain text
    downloadAllTextBtn.addEventListener('click', async () => {
        if (allConversations.length === 0) {
            alert("No conversations to download. Please load a JSON file first.");
            return;
        }

        downloadAllTextBtn.disabled = true;
        const originalText = downloadAllTextBtn.textContent;
        downloadAllTextBtn.textContent = 'Zipping Text...';

        const zip = new JSZip();
        let fileCount = 0;

        allConversations.forEach(conv => {
            try {
                const title = conv.title || 'Untitled Conversation';
                const createTime = conv.create_time ? new Date(conv.create_time * 1000).toISOString().slice(0, 10) : 'N/A';
                const fileName = `${sanitizeFilename(title)}_chatgpt_${createTime}.txt`; // .txt extension
                const convText = formatConversationAsPlainText(conv); // Use new format function
                zip.file(fileName, convText);
                fileCount++;
            } catch (error) {
                console.error(`Error processing conversation ${conv.title} for text export:`, error);
            }
        });

        if (fileCount === 0) {
            outputDiv.insertAdjacentHTML('afterbegin', '<p class="error-message">No valid conversations found to zip as text.</p>');
            downloadAllTextBtn.textContent = originalText;
            downloadAllTextBtn.disabled = false;
            return;
        }

        try {
            const content = await zip.generateAsync({ type: "blob" });
            const zipFileName = `all_chatgpt_conversations_text_${new Date().toISOString().slice(0, 10)}.zip`;
            saveAs(content, zipFileName);
        } catch (error) {
            outputDiv.insertAdjacentHTML('afterbegin', `<p class="error-message">Error generating Text ZIP file: ${error.message}</p>`);
            console.error("Error generating Text ZIP:", error);
        } finally {
            downloadAllTextBtn.textContent = originalText;
            downloadAllTextBtn.disabled = false;
        }
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
            downloadButton.innerHTML = '💾 Download JSON'; // Disk icon, text updated
            downloadButton.title = 'Download Conversation JSON';

            const downloadTextButton = document.createElement('button'); // New button
            downloadTextButton.classList.add('download-text-btn');
            downloadTextButton.innerHTML = '📄 Download Text'; // Document icon
            downloadTextButton.title = 'Download Conversation as Plain Text';

            actionsDiv.appendChild(viewButton);
            actionsDiv.appendChild(downloadButton);
            actionsDiv.appendChild(downloadTextButton); // Add new button

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

            // New event listener for downloading as plain text
            downloadTextButton.addEventListener('click', () => {
                const textContent = formatConversationAsPlainText(conv);
                const blob = new Blob([textContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                const fileName = `${sanitizeFilename(title)}_chatgpt_${new Date(conv.create_time * 1000).toISOString().slice(0, 10)}.txt`; // .txt extension
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
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

    // New helper function to format conversation as plain text
    function formatConversationAsPlainText(conversation) {
        const title = conversation.title || 'Untitled Conversation';
        const createTime = conversation.create_time ? new Date(conversation.create_time * 1000).toLocaleString() : 'N/A';
        const messages = getConversationMessages(conversation);

        let text = `Title: ${title}\n`;
        text += `Created: ${createTime}\n`;
        if (conversation.id) { // Add conversation URL if ID is available
            text += `URL: https://chat.openai.com/c/${conversation.id}\n`;
        }
        text += `\n`; // Add an empty line for separation

        if (messages.length === 0) {
            text += "--- No messages found for this conversation ---\n";
        } else {
            messages.forEach(msg => {
                const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1); // Capitalize role (User, Assistant)
                text += `--- ${role} ---\n`;
                text += `${msg.content}\n\n`; // Add an extra newline after each message for readability
            });
        }
        return text.trim(); // Remove any trailing whitespace/newlines at the very end
    }
});
