from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
socketio = SocketIO(app, cors_allowed_origins="*")

# Game state storage (can be redis)
games = {}


class TicTacToeGame:
    def __init__(self, game_id):
        self.id = game_id
        self.board = [[None, None, None], [None, None, None], [None, None, None]]
        self.current_turn = 'X'  # X always starts
        self.players = {'X': None, 'O': None}  # Will store session IDs
        self.winner = None
        self.game_over = False

    def make_move(self, row, col, player_symbol):
        # Check if valid move
        if self.board[row][col] is not None or self.game_over or self.current_turn != player_symbol:
            return False

        # Make the move
        self.board[row][col] = player_symbol

        # Check for win or draw
        if self.check_winner(row, col, player_symbol):
            self.winner = player_symbol
            self.game_over = True
        elif self.is_board_full():
            self.game_over = True
        else:
            # Switch turns
            self.current_turn = 'O' if player_symbol == 'X' else 'X'

        return True

    def check_winner(self, row, col, player_symbol):
        # Check row
        if all(self.board[row][c] == player_symbol for c in range(3)):
            return True

        # Check column
        if all(self.board[r][col] == player_symbol for r in range(3)):
            return True

        # Check diagonals
        if row == col and all(self.board[i][i] == player_symbol for i in range(3)):
            return True

        if row + col == 2 and all(self.board[i][2 - i] == player_symbol for i in range(3)):
            return True

        return False

    def is_board_full(self):
        return all(self.board[r][c] is not None for r in range(3) for c in range(3))

    def get_state(self):
        return {
            'board': self.board,
            'current_turn': self.current_turn,
            'winner': self.winner,
            'game_over': self.game_over
        }


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/game/<game_id>')
def game(game_id):
    if game_id not in games:
        return "Game not found", 404
    return render_template('game.html', game_id=game_id)


@socketio.on('create_game')
def create_game():
    session_id = request.sid
    game_id = str(uuid.uuid4())[:8]
    games[game_id] = TicTacToeGame(game_id)
    join_room(game_id)

    emit('game_created', {'game_id': game_id})


@socketio.on('join_game')
def join_game(data):
    game_id = data['game_id']
    session_id = request.sid

    if game_id not in games:
        emit('error', {'message': 'Game not found'})
        return

    game = games[game_id]
    join_room(game_id)

    # Assign player to X or O
    if game.players['X'] is None:
        game.players['X'] = session_id
        symbol = 'X'
    elif game.players['O'] is None:
        game.players['O'] = session_id
        symbol = 'O'
    else:
        # Game is full, join as spectator
        symbol = 'spectator'

    emit('player_assigned', {'symbol': symbol})

    # If both players have joined, start the game
    if game.players['X'] is not None and game.players['O'] is not None:
        emit('game_state', game.get_state(), to=game_id)


@socketio.on('make_move')
def make_move(data):
    game_id = data['game_id']
    row = data['row']
    col = data['col']
    player_symbol = data['symbol']
    session_id = request.sid

    if game_id not in games:
        emit('error', {'message': 'Game not found'})
        return

    game = games[game_id]

    # Verify that the player is allowed to make this move
    if game.players[player_symbol] != session_id:
        emit('error', {'message': 'Not your turn or not your symbol'})
        return

    if game.make_move(row, col, player_symbol):
        emit('game_state', game.get_state(), to=game_id)
    else:
        emit('error', {'message': 'Invalid move'})


@socketio.on('disconnect')
def on_disconnect():
    session_id = request.sid
    # Find and clean up any games this player was in
    for game_id, game in list(games.items()):
        if game.players['X'] == session_id or game.players['O'] == session_id:
            # Notify other player
            leave_room(game_id)
            emit('player_disconnected', to=game_id)


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)