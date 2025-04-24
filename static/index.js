document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const createGameBtn = document.getElementById('create-game');
    const joinGameBtn = document.getElementById('join-game');
    const gameIdInput = document.getElementById('game-id-input');
    const gameLink = document.getElementById('game-link');
    const gameUrl = document.getElementById('game-url');
    const gameIdDisplay = document.getElementById('game-id');
    const copyLinkBtn = document.getElementById('copy-link');
    const joinCreatedGameBtn = document.getElementById('join-created-game');

    let createdGameId = null;

    // Create a new game
    createGameBtn.addEventListener('click', () => {
        socket.emit('create_game');
    });

    // Handle game creation response
    socket.on('game_created', (data) => {
        createdGameId = data.game_id;
        const url = `${window.location.origin}/game/${createdGameId}`;

        // Show game link section
        gameLink.classList.remove('hidden');
        gameUrl.textContent = url;
        gameIdDisplay.textContent = createdGameId;
    });

    // Copy link to clipboard
    copyLinkBtn.addEventListener('click', () => {
        const url = gameUrl.textContent;
        navigator.clipboard.writeText(url).then(() => {
            copyLinkBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyLinkBtn.textContent = 'Copy';
            }, 2000);
        });
    });

    // Join a game with ID
    joinGameBtn.addEventListener('click', () => {
        const gameId = gameIdInput.value.trim();
        if (gameId) {
            window.location.href = `/game/${gameId}`;
        }
    });

    // Enter the game you created
    joinCreatedGameBtn.addEventListener('click', () => {
        if (createdGameId) {
            window.location.href = `/game/${createdGameId}`;
        }
    });

    // Handle Enter key in the game ID input
    gameIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinGameBtn.click();
        }
    });
});