
let channel = ""; // Initialize channel variable
let webSocket; // Define WebSocket variable
let processedLinks = {}; // Object to store processed links
let twitterLinks = {}; // Object to store Twitter links and their corresponding cards
let isConnected = false; // Flag to indicate if connected to Twitch chat
let cardCount = 0; // Counter for the number of cards
let isQueueOpen = false; // Flag to indicate if the queue is open (default closed)

// Function to initialize the WebSocket connection
// Function to initialize the WebSocket connection
function initWebSocket() {
    webSocket = new WebSocket(`wss://irc-ws.chat.twitch.tv:443`);
    webSocket.onopen = function (event) {
        isConnected = true;
        updateStatusIndicator();
        webSocket.send(`NICK justinfan123`);
        webSocket.send(`JOIN #${channel}`); // Join the specified channel
    };

    webSocket.onmessage = function (event) {
        if (!isQueueOpen) return; // Exit if the queue is closed
        const message = event.data;
        // Save the message first
        const savedMessage = extractMessageText(message);

        // Check if the message contains the specified word
        const channelRegex = new RegExp(`\\b(?:@)?${channel}\\b`, 'i');
        if (!channelRegex.test(savedMessage)) return;

        // Parse message for links
        const linkRegex = /(?:https?:\/\/)?(?:www\.)?(?:[\w-]+\.)+[a-z]{2,}(?:\/(?:@[\w-]+\/video\/)?[\w-./?=&%@%#]*)?/gi;
        const links = message.match(linkRegex);

        if (links && links.length > 0) {
            // Extract username from the message
            const username = message.split("!")[0].substring(1);

            // Add links to the cards container if not already processed
            links.forEach(link => {
                if (!processedLinks[link]) {
                    // Check if the link is from YouTube, TikTok, Twitch, Twitter, or an image
                    let embedCode = '';
                    let type = '';

                    if (link.includes("youtube.com") || link.includes("youtu.be")) {
                        const videoId = getYouTubeVideoId(link);
                        if (videoId) {
                            embedCode = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                            type = 'youtube';
                        }
                    } else if (link.includes("tiktok.com")) {
                        const videoId = getTikTokVideoId(link);
                        if (videoId) {
                            embedCode = `<iframe width="100%" src="https://www.tiktok.com/embed/v2/${videoId}" autoplay="0" frameborder="0" scrolling="no" allow="encrypted-media" allowfullscreen ></iframe>`;
                            type = 'tiktok';
                        } else {
                            embedCode = `<a href="${link}" target="_blank">${link}</a>`; // Create a link card for unsupported TikTok links
                            type = 'link';
                        }    
                    } else if (link.includes("clips.twitch.tv")) {
                        const clipId = getTwitchClipId(link);
                        if (clipId) {
                            embedCode = `<iframe src="https://clips.twitch.tv/embed?clip=${clipId}&parent=buh.cat&autoplay=false" width="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>`;
                            type = 'default';
                        }
                    } else if (link.includes("twitch.tv")) {
                        const videoId = getTwitchVideoId(link);
                        if (videoId) {
                            embedCode = `<iframe src="https://player.twitch.tv/?video=${videoId}&parent=buh.cat&autoplay=false" width="100%" frameborder="0" scrolling="no" allowfullscreen="true"></iframe>`;
                            type = 'default';
                        }
                    } else if (link.includes("twitter.com") || link.includes("x.com")) {
                        const videoId = getTwitterVideoId(link);
                        if (videoId) {
                            embedCode = `<div class="twitter-container" style="display: flex; justify-content: center;"></div>`;
                            type = 'twitter';
                        }
                        else if (link.includes("spotify.com")) {
                            // Check if it's a Spotify link
                            embedCode = `<iframe style="border-radius:12px" src="${link}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
                            type = 'spotify';
                        } else if (link.includes("streamable.com")) {
                            // Check if it's a Streamable link
                            const videoId = getStreamableVideoId(link);
                            if (videoId) {
                                embedCode = `<iframe src="https://streamable.com/e/${videoId}" width="100%" height="100%" frameborder="0" allowfullscreen style="width:100%;height:100%;position:absolute;left:0px;top:0px;overflow:hidden;"></iframe>`;
                                type = 'streamable';
                            }
                        }
                    } else if (isImageLink(link)) {
                        embedCode = `<div class "image-container"><img src="${link}" alt="Image"></div>`;
                        type = 'image';
                    } else {
                        embedCode = `<a href="${link}" target="_blank">${link}</a>`; // Create a link card for unsupported links
                        type = 'link';
                    }

                    if (embedCode) {
                        // Add the saved message text to the card
                        const cardContent = `<div>${embedCode}</div>`;
                        addCard(username, link, embedCode, type, savedMessage);

                        processedLinks[link] = true; // Mark link as processed
                        cardCount++; // Increment card count
                        updateCardCount(); // Update card count display
                    }
                }
            });
        }
    };
}

function fetchChat() {
    // Close the existing WebSocket connection if it exists
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.close();
    }
    // Initialize the WebSocket connection for the new channel
    initWebSocket();
}
initWebSocket();


function extractMessageText(message) {
    const firstColonIndex = message.indexOf(":");
    if (firstColonIndex !== -1) {
        const usernameEndIndex = message.indexOf("!");
        const colonAfterUsername = message.indexOf(":", usernameEndIndex);
        if (colonAfterUsername !== -1) {
            let messageText = message.substring(colonAfterUsername + 1).trim();
// Remove specified word and its variations along with @ and ,
            // Replace link with "LINK"
            messageText = messageText.replace(/(?:(?:https?:\/\/|www\.)\S+|\b\S+\.\S+)/gi, "");

            return messageText;
        }
    }
    return "";
}


// Function to update the card count display
function updateCardCount() {
    const cardCountButton = document.getElementById("card-count-button");
    cardCountButton.innerHTML = `<i class="ph ph-link"></i>Links: ${cardCount}`;

    // Display "No links submitted" text if link count is 0
    if (cardCount === 0) {
        const cardsContainer = document.getElementById("cards-container");
        cardsContainer.innerHTML = `<div id="no-links-text" class="howto" style="display: flex;flex-direction: column;gap: 1.5rem;">
        <div style="font-size: 24px;"><span style="color:#FF71D7;font-weight:500;" >Getting started</span></div>
        <div style="display: flex;justify-content: flex-start;flex-direction: column;/* align-items: flex-start; */text-align: start;max-width: 680px;gap: 8px; padding: 0rem 1rem; font-weight:400;">
           <div><span style="color:#FF71D7";>1. Enter</span> your Twitch Name.</div>
           <div><span style="color:#FF71D7";>2. Open</span> the queue.</div>
           <div><span style="color:#FF71D7";>3.</span> Your viewers can now post links in chat by tagging you in the message: <span style="color:#FF71D7";>@streamer [link] [optional message]</span></div>
           <div><span style="color:#FF71D7";>4.</span> The links will be displayed on a timeline in a form of cards.</div>
           <div><span style="color:#FF71D7";>5.</span> You can control the <span style="color:#FF71D7";>visibility</span> of all embeds and <span style="color:#FF71D7";>clear</span> the existing queue by using the buttons in the top right corner.</div>
           <div><span style="color:#FF71D7";>6.</span> This website currently supports <span style="color:#FF71D7";>YouTube, Twitch, TikTok, Streamable, Spotify</span> and <span style="color:#FF71D7";>Imgur</span> embeds.</div>
           <div><span style="color:#FF71D7";>7.</span> For suggestions and bug reports contact <span style="color:#FF71D7";>@ayyybubu</span></div>
        </div>
        <div style="font-size: 24px;"><span style="color:#FF71D7;font-weight:500;" >Example</span></div>
        <div class="card" data-link="https://youtu.be/bT2Fp-Bzozo?si=UK1ge_r_DCuAhsl_" style="opacity: 1; transition: opacity 0.5s ease 0s;">
           <div class="header-info">
              <div class="card-header">
                 <div class="card-userinfo">
                    <div class="profile-pic-con"><img src="https://static-cdn.jtvnw.net/jtv_user_pictures/53786bbe-9816-4ab8-ba5d-f9fc42881b3a-profile_image-300x300.png" class="card-profile-pic" alt="Profile picture"></div>
                    <div class="card-userinfo-text" style="display: flex; flex-direction: column;align-items: flex-start; gap: 0px;"> <span style="font-weight: 600; font-size: 16px;">ayyybubu</span> <a class="link-element" href="https://youtu.be/bT2Fp-Bzozo?si=UK1ge_r_DCuAhsl_" target="_blank"> youtu.be/bT2Fp-Bzozo</a> </div>
                 </div>
                 <div class="button-group"> <button class="toggle-button-hide card-buttons"><i class="ph ph-arrows-in-simple"></i></button> <button class="delete-button card-buttons"> <i class="ph ph-x"></i> </button> </div>
              </div>
              <div> <span style="word-wrap: break-word; text-align: left; font-weight: 300; font-size: 15px; margin-top: 0.5rem; display: flex;">Hey streamer! Check out this silly cat I found.</span></div>
           </div>
           <div class="card-content youtube-style"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/bT2Fp-Bzozo" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="" style="filter: blur(0px);"></iframe></div>
        </div>
     </div>`;
        
    } else {
        // Remove "No links submitted" text if link count is not 0
        const noLinksText = document.getElementById("no-links-text");
        if (noLinksText) {
            noLinksText.remove();
        }
    }
}
// Function to extract YouTube video ID from URL
function getYouTubeVideoId(url) {
    // Regular expression to match both regular YouTube video links and YouTube Shorts links
    const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|(?:youtu\.be\/|youtube\.com\/shorts\/))([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match && match[1];
}

// Function to extract TikTok video ID from URL
function getTikTokVideoId(url) {
    const regExp = /\/video\/(\d+)/;
    const match = url.match(regExp);
    return match && match[1];
}

function getTwitchClipId(url) {
    const regExp = /clips.twitch.tv\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}
// Function to extract Streamable video ID from the link
function getStreamableVideoId(link) {
    const match = link.match(/(?:streamable\.com)\/(?:e\/)?([\w]+)/);
    return match ? match[1] : null;
}

// Function to extract Twitch video ID from URL
function getTwitchVideoId(url) {
    const regExp = /videos\/(\d+)/;
    const match = url.match(regExp);
    return match && match[1];
}
// Function to extract Twitter video ID from URL
function getTwitterVideoId(url) {
    // Prepend "https://" to the link if it doesn't already start with it
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = 'https://' + url;
    }

    // Regular expression to match Twitter status URL patterns
    const regExp = /twitter\.com\/[^/]+\/status\/(\d+)/;
    const regExpWithX = /x\.com\/[^/]+\/status\/(\d+)/;
    const match = url.match(regExp) || url.match(regExpWithX);
    return match && match[1];
}


function createCard(username, link, embedCode, type, savedMessage) {
    const card = document.createElement('div');
    card.classList.add('card');
    if (type === 'tiktok') {
        card.classList.add('tiktok-card');
    }
    card.dataset.link = link;
    // If it's an Imgur link, modify the embed URL based on whether it's an album or single image
    if (type === 'imgur') {
        const imgurIdData = getImgurId(link);
        if (imgurIdData) {
            const { id, isAlbum } = imgurIdData;
            const embedUrl = isAlbum
                ? `https://imgur.com/a/${id}/embed?pub=true&ref=${window.location.href}&w=540`
                : `https://imgur.com/${id}/embed?pub=true&ref=${window.location.href}&w=540`;
            embedCode = `<iframe allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true" class="imgur-embed-iframe-pub imgur-embed-iframe-pub-a-${id}-true-540" scrolling="no" src="${embedUrl}" id="imgur-embed-iframe-pub-a-${id}" style="height: 500px; width: 540px; margin: 10px 0px; padding: 0px;"></iframe>`;
        }
    }
    // Create headerInfo container
    const headerInfo = document.createElement('div');
    headerInfo.classList.add('header-info');

    // Create shortened link element
    const cleanedLink = link.replace(/(^\w+:|^)\/\//, '').replace('www.', ''); // Remove protocols and 'www'
    const shortenedLink = cleanedLink.length > 60 ? cleanedLink.substring(0, 60) + "..." : cleanedLink;

    const linkElement = document.createElement('a');
    linkElement.classList.add('link-element');
    linkElement.href = link;
    linkElement.target = "_blank";

    // Set styles for the link element
    linkElement.innerHTML = `
        ${shortenedLink}
    `;

    // Create cardHeader
    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header');
    cardHeader.innerHTML = `
        <div class="card-userinfo"> 
            <div class="profile-pic-con"><img src="https://static-cdn.jtvnw.net/user-default-pictures-uv/41780b5a-def8-11e9-94d9-784f43822e80-profile_image-300x300.png" class="card-profile-pic" alt="Profile picture"></div>
            <div class="card-userinfo-text" style="display: flex; flex-direction: column;align-items: flex-start; gap: 0px;">   
                <span style="font-weight: 600; font-size: 16px;">${username}</span> 
                ${linkElement.outerHTML} 
            </div>
        </div>
        <div class="button-group">
            ${type !== 'link' ? '<button class="toggle-button-hide card-buttons"><i class="ph ph-arrows-in-simple"></i></button>' : ''}
            <button class="delete-button card-buttons">
                <i class="ph ph-x"></i>
            </button>
        </div>
    `;
    headerInfo.appendChild(cardHeader);

    // Create the savedMessage div
    const savedMessageDiv = document.createElement('div');
    savedMessageDiv.innerHTML = `
        <span style="word-wrap: break-word; text-align: left; font-weight: 300; font-size: 15px; margin-top: 0.5rem; display: flex;">${savedMessage}</span>
    `;

    // Append savedMessageDiv to the headerInfo container
    headerInfo.appendChild(savedMessageDiv);

    card.appendChild(headerInfo);

    // Create card content based on type
    if (type !== 'link') {
        const cardContent = document.createElement('div');
        cardContent.classList.add('card-content');
        if (type === 'tiktok') {
            cardContent.classList.add('tiktok-content');
        } else if (type === 'twitter') {
            cardContent.classList.add('twitter-style');
        }
        else if (type === 'youtube') {
            cardContent.classList.add('youtube-style');
        }
        else if (type === 'twitch') {
            cardContent.classList.add('twitch-style');
        }
        // For Imgur embeds, wrap the embed code inside a container div
        else if (type === 'imgur') {
            cardContent.classList.add('imgur-style');
        }
        cardContent.innerHTML = embedCode;
        card.appendChild(cardContent);
    }

    // Add event listener to delete button
    card.querySelector('.delete-button').addEventListener('click', function() {
        card.remove();
        cardCount--;
        updateCardCount();
        const link = card.dataset.link;
        delete processedLinks[link];
    });
// Create the button to toggle blur
const blurButton = document.createElement('button');
blurButton.classList.add('toggle-blur-button');
blurButton.textContent = 'Show Content';
blurButton.addEventListener('click', function() {
    const cardContent = card.querySelector('.card-content');
    if (cardContent) {
        const iframe = cardContent.querySelector('iframe');
        if (iframe) {
            if (iframe.style.filter === 'blur(12px)') {
                iframe.style.filter = 'blur(0px)';
            } else {
                iframe.style.filter = 'blur(0px)';
            }
        } else {
            const image = cardContent.querySelector('img');
            if (image) {
                if (image.style.filter === 'blur(12px)') {
                    image.style.filter = 'blur(0px)';
                } else {
                    image.style.filter = 'blur(0px)';
                }
            }
        }
    }

    // Hide the button after clicking
    blurButton.style.display = 'none';
});

// Add the button to the card content
const cardContent = card.querySelector('.card-content');
if (cardContent) {
    if (!blurHidden){
        blurButton.style.display = 'none';
    }
    cardContent.appendChild(blurButton);
}


    return card;
}



// Function to toggle visibility of embed inside card
function toggleEmbed(cardContent) {
    cardContent.classList.toggle('hidden');
}

// Event listener for toggle button clicks
document.addEventListener('click', function(event) {
    const toggleButton = event.target.closest('.toggle-button-hide');
    if (toggleButton) {
        const icon = toggleButton.querySelector('i');
        const card = toggleButton.closest('.card');
        const cardContent = card.querySelector('.card-content');
        
        if (cardContent) {
            toggleEmbed(cardContent);
            // Toggle icon
            if (icon.classList.contains('ph-arrows-in-simple')) {
                icon.classList.remove('ph-arrows-in-simple');
                icon.classList.add('ph-arrows-out-simple');
            } else {
                icon.classList.remove('ph-arrows-out-simple');
                icon.classList.add('ph-arrows-in-simple');
            }
        }
    }
});



// Function to check if a link is a Twitter video link
function isTwitterVideoLink(link) {
    return link.includes("twitter.com") || link.includes("x.com") && link.includes("/status/");
}

// Inside the addTwitterEmbed function
function addTwitterEmbed(link, card, blurHidden) {
    const videoId = getTwitterVideoId(link);
    const twitterEmbedCode = `
        <blockquote class="twitter-tweet" data-theme="dark">
            <a href="https://twitter.com/user/status/${videoId}"></a>
        </blockquote>
    `;
    const twitterContainer = card.querySelector(".twitter-container");
    twitterContainer.innerHTML = twitterEmbedCode;

    // Apply blur effect if blurHidden is true
    if (blurHidden) {
        const observer = new MutationObserver((mutationsList, observer) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const iframe = twitterContainer.querySelector('iframe');
                    if (iframe) {
                        iframe.style.filter = 'blur(12px)';
                        observer.disconnect(); // Disconnect observer once iframe is found and blurred
                    }
                }
            }
        });

        // Start observing changes in the twitterContainer
        observer.observe(twitterContainer, { childList: true });
    }

    // Since Twitter widgets.js may have already loaded, we check if twttr object is available
    if (window.twttr && typeof window.twttr.widgets === 'object' && typeof window.twttr.widgets.load === 'function') {
        // If the twttr object is available, directly call the widgets.load method
        window.twttr.widgets.load();
    } else {
        // If the twttr object is not available, load the Twitter SDK asynchronously
        loadTwitterSDK(() => {
            // After loading the Twitter SDK, call the widgets.load method
            window.twttr.widgets.load();
        });
    }
}



// Function to load the Twitter SDK asynchronously
function loadTwitterSDK(callback) {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.charset = 'utf-8';
    script.async = true;
    script.onload = callback; // Call the callback function once the script is loaded
    document.body.appendChild(script);
}
// Function to check if a link is an image link
function isImageLink(link) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg']; // Add more image extensions if needed
    const lowerCaseLink = link.toLowerCase();
    return imageExtensions.some(ext => lowerCaseLink.includes(`.${ext}`));
}

// Function to add a card to the cards container
function addCard(username, link, embedCode, card, savedMessage) {
    const cardsContainer = document.getElementById("cards-container");
    let type = '';
    
    if (!link.startsWith('https://')) {
    link = 'http://' + link; // Prepend "http://" to the link
    }

    if (link.includes("youtube.com") || link.includes("youtu.be")) {
        type = 'youtube';
    } else if (link.includes("clips.twitch.tv")) {
        type = 'twitch';
    } else if (link.includes("twitch.tv")) {
        type = 'twitch';
    } else if (isTwitterVideoLink(link)) {
        // Prepend "https://" to the link if it's a Twitter link and doesn't start with it
        if (!link.startsWith('https://') && !link.startsWith('http://')) {
            link = 'https://' + link;
        }
        type = 'twitter';
    } else if (link.includes("tiktok.com") && link.includes("/video/")) {
        type = 'tiktok';
    
    }  else if (link.includes("streamable.com")) {
        const videoId = getStreamableVideoId(link);
        embedCode = `
        <iframe src="https://streamable.com/e/216wpo"  width="100%" height="100%" frameborder="0" allowfullscreen style="border-radius: 0.625rem; width:100%;height:100%;position:absolute;left:0px;top:0px;overflow:hidden;"></iframe></div>
    `;
        type = 'youtube';
        
    } else if (link.includes("imgur.com")) {
        // If the link is from Imgur, create the Imgur embed code
        const imgurId = getImgurId(link);
        if (imgurId) {
            embedCode = `
            <blockquote class="imgur-embed-pub" lang="en" data-id="${imgurId}">
                <a href=""//imgur.com/a/${imgurId};">View on Imgur</a>
            </blockquote>
            <script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>
        `;
            type = 'imgur';

            // Load Imgur SDK asynchronously
            loadImgurSDK();
        }
    } else if (isImageLink(link)) {
        type = 'image';
    } else if (link.includes("open.spotify.com")) {
        embedCode = `
            <iframe style="border-radius:12px; width: 100%;
            height: 152px;" src="${link.replace(
                'https://open.spotify.com',
                'https://open.spotify.com/embed'
            )}?utm_source=generator&theme=0" width="100%" height="152" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        `;
        type = 'spotify';
    } else {
        type = 'link'; // Treat other links as regular links
    }

    // Inside addCard function
    const createdCard = createCard(username, link, embedCode, type, savedMessage);
    if (blurHidden) {
        const cardContent = createdCard.querySelector('.card-content');
        if (cardContent) {
            const iframe = cardContent.querySelector('iframe');
            if (iframe) {
                iframe.style.filter = 'blur(12px)';
            }
            const images = cardContent.querySelectorAll('img');
            images.forEach(image => {
                image.style.filter = 'blur(12px)';
            });
        }
    }
    cardsContainer.appendChild(createdCard);

    // Apply fade-in animation
    createdCard.style.opacity = '0';
    cardsContainer.appendChild(createdCard);
    setTimeout(() => {
        createdCard.style.opacity = '1';
    }, 10); // Delay to allow the browser to apply the opacity change

    // Trigger reflow to force the browser to apply the opacity change before transitioning
    void createdCard.offsetWidth;
    createdCard.style.transition = 'opacity 0.5s';
    createdCard.style.opacity = '1'; // Set opacity to trigger the transition

    // If the link is a Twitter video link, add the Twitter embed to the website
    if (type === 'twitter') {
        addTwitterEmbed(link, createdCard, blurHidden);
    } else if (type === 'image') {
        // If the link is an image, create an image element and append it to the card content
        const cardContent = createdCard.querySelector('.card-content');
        cardContent.classList.add('image-style');
        const imageElement = document.createElement('img');
        cardContent.style.paddingTop = '0%';
    }
}

// Function to load the Imgur SDK asynchronously
function loadImgurSDK() {
    const script = document.createElement('script');
    script.src = 'https://s.imgur.com/min/embed.js';
    script.charset = 'utf-8';
    script.async = true;
    document.body.appendChild(script);
}

// Function to extract Imgur ID from URL
function getImgurId(url) {
    const regExp = /imgur\.com\/(?:gallery\/)?(?:a\/)?(\w+)/;
    const match = url.match(regExp);
    if (match && match[1]) {
        // Check if it's an album or single image
        const isAlbum = url.includes("/a/") || url.includes("/gallery/");
        return { id: match[1], isAlbum: isAlbum };
    }
    return null;
}



// Function to remove a card from the cards container with fade-out effect
function removeCard(card) {
    // Apply fade-out animation
    card.style.opacity = '0';
    card.addEventListener('transitionend', () => {
        card.remove();
    });
}



// Fetch chat every 5 seconds
setInterval(fetchChat, 5000);

// Call fetchChat initially
fetchChat();

// Reset table button functionality
document.getElementById("reset-button").addEventListener("click", function() {
    // Prompt the user for confirmation before clearing the queue
    const isConfirmed = confirm("Are you sure you want to clear the queue?");
    
    // Check if the user confirmed
    if (isConfirmed) {
        const cardsContainer = document.getElementById("cards-container");
        cardsContainer.innerHTML = '';
        processedLinks = {};
        cardCount = 0; // Reset the card count
        updateCardCount(); // Update the card count display
    }
});
// Add event listener for the beforeunload event
window.addEventListener('beforeunload', function(event) {
    // Check if there are links on the page
    const cardsContainer = document.getElementById("cards-container");
    const cards = cardsContainer.querySelectorAll('.card');
    if (cards.length > 0) {
        // Display a confirmation dialog
        const confirmationMessage = 'Are you sure you want to leave? There are still links on the page.';
        event.returnValue = confirmationMessage; // For older browsers
        return confirmationMessage; // For modern browsers
    }
});



//Toggle queue button functionality
document.getElementById("toggle-queue-button").addEventListener("click", function() {
    isQueueOpen = !isQueueOpen; // Toggle queue status
    this.innerHTML = isQueueOpen ? '<i class="ph ph-lock-key-open"></i> Queue Open' : '<i class="ph ph-lock-key"></i> Queue Closed'; // Update button content
    this.classList.toggle('close', !isQueueOpen); // Add 'close' class if queue is closed
});


// Update connection status indicator
function updateStatusIndicator() {
    const loader = document.getElementById('loader');
    if (isConnected) {
        loader.style.display = 'none'; // Hide the loader when connected
    } else {
        loader.style.display = 'block'; // Show the loader when not connected
    }
}

// Scroll to top button functionality
document.getElementById("scroll-to-top-button").addEventListener("click", function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Show connection status and initial card count
document.addEventListener('DOMContentLoaded', function() {
    updateStatusIndicator();
    // Set the queue status button and flag to "closed" on page load
    document.getElementById("toggle-queue-button").innerHTML = '<i class="ph ph-lock-key"></i> Queue Closed';
    document.getElementById("toggle-queue-button").classList.add('close');
    isQueueOpen = false;

    // Update card count initially
    updateCardCount();
});
// Add event listener for the hide/show embeds button
document.getElementById("hide-embeds-button").addEventListener("click", function() {
    const cards = document.querySelectorAll('.card');
    const hideEmbeds = this.getAttribute('data-state') === 'hide';

    cards.forEach(card => {
        const cardContent = card.querySelector('.card-content');
        if (cardContent) {
            if (hideEmbeds) {
                cardContent.classList.add('hidden'); // Hide the embed content
            } else {
                cardContent.classList.remove('hidden'); // Show the embed content
            }
        }
    });

    // Toggle button state and update button icon
    if (hideEmbeds) {
        this.setAttribute('data-state', 'show');
        this.innerHTML = `<i class="ph ph-eye-slash"></i>`;
    } else {
        this.setAttribute('data-state', 'hide');
        this.innerHTML = `<i class="ph ph-eye"></i>`;
    }
});





// Add event listener for the save button
document.addEventListener('click', function(event) {
    const saveButton = event.target.closest('#change-channel-button');
    if (saveButton) {
        const channelInput = document.getElementById('channel-input');
        const newChannel = channelInput.value.trim();
        
        // Replace the channel control with the username element
        const usernameElement = document.createElement('div');
        usernameElement.classList.add('username-text');
        usernameElement.innerHTML = `
        <div class="username-con"><div class="profile-pic-con"><img src="https://static-cdn.jtvnw.net/user-default-pictures-uv/41780b5a-def8-11e9-94d9-784f43822e80-profile_image-300x300.png" class="profile-pic" alt="Profile picture"></div>
            ${newChannel}
            <button id="edit-username" class="edit-username"><i class="ph ph-pencil-simple-line"></i></button>
        `;
        const channelControl = saveButton.closest('.channel-control');
        channelControl.replaceWith(usernameElement);

        // Save the channel as a cookie
        setCookie('channel', newChannel, 30); // Save the channel cookie for 30 days

        // Set the channel to the new channel
        channel = newChannel;
    }
});
// Add event listener for the edit username button
document.addEventListener('click', function(event) {
    const editButton = event.target.closest('#edit-username');
    if (editButton) {
        const usernameElement = editButton.closest('.username-text');
        const username = usernameElement.textContent.trim();
        
        // Create the channel control input field and save button
        const channelControl = document.createElement('div');
        channelControl.classList.add('channel-control');
        channelControl.innerHTML = `
            <input required placeholder="Channel name" type="text" id="channel-input" value="${username}" />
            <button id="change-channel-button" class="save-button"><i class="ph ph-floppy-disk"></i></button>
        `;

        // Replace the username element with the channel control
        usernameElement.replaceWith(channelControl);
    }
});

// Function to set a cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// Function to get a cookie by name
function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) == ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) == 0) {
            return cookie.substring(nameEQ.length, cookie.length);
        }
    }
    return null;
}

// Function to delete a cookie by name
function deleteCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999;";  
}

// Check if there's a channel cookie saved
const channelCookie = getCookie('channel');
if (channelCookie) {
    const usernameElement = document.createElement('div');
    usernameElement.classList.add('username-text');
    usernameElement.innerHTML = `
    <div class="username-con"><div class="profile-pic-con"><img src="https://static-cdn.jtvnw.net/user-default-pictures-uv/41780b5a-def8-11e9-94d9-784f43822e80-profile_image-300x300.png" class="profile-pic" alt="Profile picture"></div>
        ${channelCookie}
        <button id="edit-username" class="edit-username"><i class="ph ph-pencil-simple-line"></i></button>
    `;
    const channelControl = document.querySelector('.channel-control');
    channelControl.replaceWith(usernameElement);
    channel = channelCookie; // Set the channel to the cookie channel
}

// Create the button to reset blur for all cards
const resetBlurButton = document.getElementById('resetBlurButton');
let blurHidden = true;

resetBlurButton.addEventListener('click', function() {
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
        const cardContent = card.querySelector('.card-content');
        if (cardContent) {
            const iframe = cardContent.querySelector('iframe');
            if (iframe) {
                if (blurHidden) {
                    iframe.style.filter = 'blur(0px)';
                } else {
                    iframe.style.filter = 'blur(12px)';
                }
                
                const toggleBlurButton = cardContent.querySelector('.toggle-blur-button');
                if (toggleBlurButton) {
                    toggleBlurButton.style.display = blurHidden ? 'none' : ''; // Show the toggle blur button if blur is visible
                }
            }
            
            const images = cardContent.querySelectorAll('img'); // Select all images inside card-content
            images.forEach(image => {
                if (blurHidden) {
                    image.style.filter = 'blur(0px)';
                } else {
                    image.style.filter = 'blur(12px)';
                }
            });

            const toggleBlurButton = cardContent.querySelector('.toggle-blur-button');
            if (toggleBlurButton) {
                toggleBlurButton.style.display = blurHidden ? 'none' : ''; // Show the toggle blur button if blur is visible
            }
        }
    });

    // Toggle blurHidden variable
    blurHidden = !blurHidden;

    // Change icon based on blur visibility
    const icon = resetBlurButton.querySelector('i');
    icon.classList.toggle('ph-drop-slash', !blurHidden);
    icon.classList.toggle('ph-drop', blurHidden);
});
// Update the blur state for newly created cards
const cards = document.querySelectorAll('.card');
cards.forEach(card => {
    const cardContent = card.querySelector('.card-content');
    if (cardContent) {
        const iframe = cardContent.querySelector('iframe');
        if (iframe) {
            if (blurHidden) {
                iframe.style.filter = 'blur(12px)';
            } else {
                iframe.style.filter = 'blur(0px)';
            }
        }
        const images = cardContent.querySelectorAll('img');
        images.forEach(image => {
            if (blurHidden) {
                image.style.filter = 'blur(12px)';
            } else {
                image.style.filter = 'blur(0px)';
            }
        });
    }
});
// Update blurButton visibility
if (blurHidden) {
    blurButton.style.display = 'none';
} else {
    blurButton.style.display = 'block';
}