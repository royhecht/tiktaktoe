document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const gameId = document.getElementById('game-id').textContent;
    const playerSymbolEl = document.getElementById('player-symbol');
    const currentTurnEl = document.getElementById('current-turn');
    const gameBoard = document.getElementById('game-board');
    const gameStatus = document.getElementById('game-status');
    const backToHomeBtn = document.getElementById('back-to-home');

    let playerSymbol = null;
    let currentTurn = null;
    let gameOver = false;

    // Join the game
    socket.emit('join_game', { game_id: gameId });

    // Handle player assignment
    socket.on('player_assigned', (data) => {
        playerSymbol = data.symbol;
        playerSymbolEl.textContent = playerSymbol === 'spectator' ? 'Spectator' : playerSymbol;

        if (playerSymbol === 'spectator') {
            gameStatus.textContent = 'You are watching this game as a spectator.';
        }
    });

    // Handle game state updates
    socket.on('game_state', (data) => {
        updateBoard(data.board);
        currentTurn = data.current_turn;
        gameOver = data.game_over;

        currentTurnEl.textContent = currentTurn;

        // Update game status
        if (gameOver) {
            if (data.winner) {
                gameStatus.textContent = `Game Over! Player ${data.winner} wins!`;
            } else {
                gameStatus.textContent = "Game Over! It's a draw!";
            }
        } else if (playerSymbol === 'spectator') {
            gameStatus.textContent = `You are watching. Current turn: ${currentTurn}`;
        } else if (currentTurn === playerSymbol) {
            gameStatus.textContent = "Your turn";
        } else {
            gameStatus.textContent = "Opponent's turn";
        }
    });

    // Handle error messages
    socket.on('error', (data) => {
        alert(data.message);
    });

    // Handle player disconnection
    socket.on('player_disconnected', () => {
        gameStatus.textContent = "The other player has disconnected.";
        gameOver = true;
    });

    // Handle cell clicks
    gameBoard.addEventListener('click', (e) => {
        if (!playerSymbol || playerSymbol === 'spectator' || gameOver) return;

        const cell = e.target.closest('.cell');
        if (!cell) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (cell.textContent === '' && currentTurn === playerSymbol) {
            socket.emit('make_move', {
                game_id: gameId,
                row: row,
                col: col,
                symbol: playerSymbol
            });
        }
    });

    // Back to home button
    backToHomeBtn.addEventListener('click', () => {
        window.location.href = '/';
    });

    // Update the board based on the game state
    function updateBoard(board) {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                const value = board[row][col];

                if (value) {
                    cell.textContent = value;
                    cell.classList.add(value.toLowerCase());
                } else {
                    cell.textContent = '';
                    cell.classList.remove('x', 'o');
                }
            }
        }
    }
});