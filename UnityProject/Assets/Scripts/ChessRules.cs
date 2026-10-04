using System;
using System.Collections.Generic;
using System.Text;

namespace MashupArena
{
    public enum ChessSide { White, Black }
    public enum ChessKind { None, King, Queen, Rook, Bishop, Knight, Pawn }
    public enum ChessResult { None, WhiteWin, BlackWin, Draw }

    public struct ChessPiece
    {
        public ChessSide Side;
        public ChessKind Kind;

        public ChessPiece(ChessSide side, ChessKind kind)
        {
            Side = side;
            Kind = kind;
        }
    }

    public struct ChessMove
    {
        public int From;
        public int To;
        public ChessKind Promotion;

        public ChessMove(int from, int to, ChessKind promotion = ChessKind.None)
        {
            From = from;
            To = to;
            Promotion = promotion;
        }

        public override string ToString()
        {
            return ChessRules.SquareName(From) + ChessRules.SquareName(To) +
                (Promotion == ChessKind.None ? "" : Promotion.ToString().Substring(0, 1).ToLowerInvariant());
        }
    }

    public sealed class ChessPosition
    {
        public ChessPiece?[] Board = new ChessPiece?[64];
        public ChessSide Turn = ChessSide.White;
        public bool WhiteKingSide = true;
        public bool WhiteQueenSide = true;
        public bool BlackKingSide = true;
        public bool BlackQueenSide = true;
        public int EnPassant = -1;
        public int HalfmoveClock;
        public int FullmoveNumber = 1;
        public int Ply;
        public bool InCheck;
        public ChessResult Result;
        public string ResultReason = "";
        public Dictionary<string, int> PositionCounts = new Dictionary<string, int>();

        public ChessPosition Copy()
        {
            return new ChessPosition
            {
                Board = (ChessPiece?[])Board.Clone(), Turn = Turn,
                WhiteKingSide = WhiteKingSide, WhiteQueenSide = WhiteQueenSide,
                BlackKingSide = BlackKingSide, BlackQueenSide = BlackQueenSide,
                EnPassant = EnPassant, HalfmoveClock = HalfmoveClock,
                FullmoveNumber = FullmoveNumber, Ply = Ply, InCheck = InCheck,
                Result = Result, ResultReason = ResultReason,
                PositionCounts = new Dictionary<string, int>(PositionCounts)
            };
        }
    }

    [Serializable]
    public sealed class ChessSnapshot
    {
        public int version = 1;
        public string board;
        public int turn;
        public bool whiteKingSide;
        public bool whiteQueenSide;
        public bool blackKingSide;
        public bool blackQueenSide;
        public int enPassant;
        public int halfmoveClock;
        public int fullmoveNumber;
        public int ply;
        public bool inCheck;
        public int result;
        public string resultReason;
        public string[] positionKeys;
        public int[] positionValues;
    }

    /// <summary>Pure rules ported from src/games/chess/rules.ts; no Unity APIs.</summary>
    public static class ChessRules
    {
        private static readonly ChessKind[] Back =
        {
            ChessKind.Rook, ChessKind.Knight, ChessKind.Bishop, ChessKind.Queen,
            ChessKind.King, ChessKind.Bishop, ChessKind.Knight, ChessKind.Rook
        };
        private static readonly ChessKind[] Promotions =
            { ChessKind.Queen, ChessKind.Rook, ChessKind.Bishop, ChessKind.Knight };
        private static readonly int[,] KnightSteps =
            { {1,2},{2,1},{2,-1},{1,-2},{-1,-2},{-2,-1},{-2,1},{-1,2} };
        private static readonly int[,] KingSteps =
            { {1,1},{1,0},{1,-1},{0,1},{0,-1},{-1,1},{-1,0},{-1,-1} };
        private static readonly int[,] RookDirs = { {1,0},{-1,0},{0,1},{0,-1} };
        private static readonly int[,] BishopDirs = { {1,1},{1,-1},{-1,1},{-1,-1} };

        private static int File(int square) { return square % 8; }
        private static int Rank(int square) { return square / 8; }
        private static int Square(int file, int rank) { return rank * 8 + file; }
        private static bool Inside(int file, int rank)
        {
            return file >= 0 && file < 8 && rank >= 0 && rank < 8;
        }
        private static ChessSide Opposite(ChessSide side)
        {
            return side == ChessSide.White ? ChessSide.Black : ChessSide.White;
        }

        public static string SquareName(int square)
        {
            return ((char)('a' + File(square))).ToString() + (Rank(square) + 1);
        }

        public static ChessPosition NewGame()
        {
            var state = new ChessPosition();
            for (var file = 0; file < 8; file++)
            {
                state.Board[file] = new ChessPiece(ChessSide.White, Back[file]);
                state.Board[8 + file] = new ChessPiece(ChessSide.White, ChessKind.Pawn);
                state.Board[48 + file] = new ChessPiece(ChessSide.Black, ChessKind.Pawn);
                state.Board[56 + file] = new ChessPiece(ChessSide.Black, Back[file]);
            }
            state.PositionCounts[PositionKey(state)] = 1;
            return state;
        }

        public static string PositionKey(ChessPosition state)
        {
            var key = new StringBuilder(80);
            foreach (var item in state.Board)
            {
                if (!item.HasValue) { key.Append('.'); continue; }
                char token;
                switch (item.Value.Kind)
                {
                    case ChessKind.King: token = 'k'; break;
                    case ChessKind.Queen: token = 'q'; break;
                    case ChessKind.Rook: token = 'r'; break;
                    case ChessKind.Bishop: token = 'b'; break;
                    case ChessKind.Knight: token = 'n'; break;
                    default: token = 'p'; break;
                }
                key.Append(item.Value.Side == ChessSide.White ? char.ToUpperInvariant(token) : token);
            }
            key.Append(state.Turn == ChessSide.White ? ":w:" : ":b:");
            var rights = key.Length;
            if (state.WhiteKingSide) key.Append('K');
            if (state.WhiteQueenSide) key.Append('Q');
            if (state.BlackKingSide) key.Append('k');
            if (state.BlackQueenSide) key.Append('q');
            if (key.Length == rights) key.Append('-');
            key.Append(':');
            key.Append(state.EnPassant < 0 ? "-" : SquareName(state.EnPassant));
            return key.ToString();
        }

        public static bool IsSquareAttacked(ChessPiece?[] board, int square, ChessSide by)
        {
            var file = File(square);
            var rank = Rank(square);
            var pawnRank = rank + (by == ChessSide.White ? -1 : 1);
            foreach (var df in new[] { -1, 1 })
            {
                var f = file + df;
                if (Inside(f, pawnRank) && Matches(board[Square(f, pawnRank)], by, ChessKind.Pawn))
                    return true;
            }
            for (var i = 0; i < KnightSteps.GetLength(0); i++)
            {
                var f = file + KnightSteps[i, 0];
                var r = rank + KnightSteps[i, 1];
                if (Inside(f, r) && Matches(board[Square(f, r)], by, ChessKind.Knight)) return true;
            }
            for (var i = 0; i < KingSteps.GetLength(0); i++)
            {
                var f = file + KingSteps[i, 0];
                var r = rank + KingSteps[i, 1];
                if (Inside(f, r) && Matches(board[Square(f, r)], by, ChessKind.King)) return true;
            }
            return RayAttack(board, file, rank, by, RookDirs, ChessKind.Rook) ||
                RayAttack(board, file, rank, by, BishopDirs, ChessKind.Bishop);
        }

        private static bool Matches(ChessPiece? piece, ChessSide side, ChessKind kind)
        {
            return piece.HasValue && piece.Value.Side == side && piece.Value.Kind == kind;
        }

        private static bool RayAttack(ChessPiece?[] board, int file, int rank,
            ChessSide by, int[,] directions, ChessKind kind)
        {
            for (var i = 0; i < directions.GetLength(0); i++)
            {
                var f = file + directions[i, 0];
                var r = rank + directions[i, 1];
                while (Inside(f, r))
                {
                    var piece = board[Square(f, r)];
                    if (piece.HasValue)
                    {
                        if (piece.Value.Side == by &&
                            (piece.Value.Kind == kind || piece.Value.Kind == ChessKind.Queen)) return true;
                        break;
                    }
                    f += directions[i, 0];
                    r += directions[i, 1];
                }
            }
            return false;
        }

        public static bool IsInCheck(ChessPiece?[] board, ChessSide side)
        {
            for (var square = 0; square < 64; square++)
                if (Matches(board[square], side, ChessKind.King))
                    return IsSquareAttacked(board, square, Opposite(side));
            return false;
        }

        private static void Add(List<ChessMove> moves, int from, int to, bool promotion)
        {
            if (promotion)
                foreach (var kind in Promotions) moves.Add(new ChessMove(from, to, kind));
            else moves.Add(new ChessMove(from, to));
        }

        private static void Slide(ChessPosition state, ChessSide side, int from,
            int[,] directions, List<ChessMove> moves)
        {
            for (var i = 0; i < directions.GetLength(0); i++)
            {
                var f = File(from) + directions[i, 0];
                var r = Rank(from) + directions[i, 1];
                while (Inside(f, r))
                {
                    var to = Square(f, r);
                    var target = state.Board[to];
                    if (!target.HasValue) Add(moves, from, to, false);
                    else
                    {
                        if (target.Value.Side != side && target.Value.Kind != ChessKind.King)
                            Add(moves, from, to, false);
                        break;
                    }
                    f += directions[i, 0];
                    r += directions[i, 1];
                }
            }
        }

        private static List<ChessMove> PseudoMoves(ChessPosition state, ChessSide side)
        {
            var moves = new List<ChessMove>();
            for (var from = 0; from < 64; from++)
            {
                var item = state.Board[from];
                if (!item.HasValue || item.Value.Side != side) continue;
                var file = File(from);
                var rank = Rank(from);
                switch (item.Value.Kind)
                {
                    case ChessKind.Pawn:
                    {
                        var dr = side == ChessSide.White ? 1 : -1;
                        var start = side == ChessSide.White ? 1 : 6;
                        var last = side == ChessSide.White ? 7 : 0;
                        var oneRank = rank + dr;
                        if (Inside(file, oneRank) && !state.Board[Square(file, oneRank)].HasValue)
                        {
                            Add(moves, from, Square(file, oneRank), oneRank == last);
                            var twoRank = rank + 2 * dr;
                            if (rank == start && !state.Board[Square(file, twoRank)].HasValue)
                                Add(moves, from, Square(file, twoRank), false);
                        }
                        foreach (var df in new[] { -1, 1 })
                        {
                            var tf = file + df;
                            var tr = rank + dr;
                            if (!Inside(tf, tr)) continue;
                            var to = Square(tf, tr);
                            var target = state.Board[to];
                            if ((target.HasValue && target.Value.Side != side &&
                                 target.Value.Kind != ChessKind.King) || to == state.EnPassant)
                                Add(moves, from, to, tr == last);
                        }
                        break;
                    }
                    case ChessKind.Knight:
                        for (var i = 0; i < KnightSteps.GetLength(0); i++)
                        {
                            var tf = file + KnightSteps[i, 0];
                            var tr = rank + KnightSteps[i, 1];
                            if (!Inside(tf, tr)) continue;
                            var to = Square(tf, tr);
                            var target = state.Board[to];
                            if (!target.HasValue ||
                                (target.Value.Side != side && target.Value.Kind != ChessKind.King))
                                Add(moves, from, to, false);
                        }
                        break;
                    case ChessKind.Bishop: Slide(state, side, from, BishopDirs, moves); break;
                    case ChessKind.Rook: Slide(state, side, from, RookDirs, moves); break;
                    case ChessKind.Queen:
                        Slide(state, side, from, RookDirs, moves);
                        Slide(state, side, from, BishopDirs, moves);
                        break;
                    case ChessKind.King:
                        for (var i = 0; i < KingSteps.GetLength(0); i++)
                        {
                            var tf = file + KingSteps[i, 0];
                            var tr = rank + KingSteps[i, 1];
                            if (!Inside(tf, tr)) continue;
                            var to = Square(tf, tr);
                            var target = state.Board[to];
                            if (!target.HasValue ||
                                (target.Value.Side != side && target.Value.Kind != ChessKind.King))
                                Add(moves, from, to, false);
                        }
                        AddCastling(state, side, from, moves);
                        break;
                }
            }
            return moves;
        }

        private static void AddCastling(ChessPosition state, ChessSide side, int from,
            List<ChessMove> moves)
        {
            var home = side == ChessSide.White ? 4 : 60;
            if (from != home || IsSquareAttacked(state.Board, home, Opposite(side))) return;
            var kingSide = side == ChessSide.White ? state.WhiteKingSide : state.BlackKingSide;
            var queenSide = side == ChessSide.White ? state.WhiteQueenSide : state.BlackQueenSide;
            if (kingSide && !state.Board[home + 1].HasValue && !state.Board[home + 2].HasValue &&
                Matches(state.Board[home + 3], side, ChessKind.Rook) &&
                !IsSquareAttacked(state.Board, home + 1, Opposite(side)) &&
                !IsSquareAttacked(state.Board, home + 2, Opposite(side)))
                Add(moves, from, home + 2, false);
            if (queenSide && !state.Board[home - 1].HasValue && !state.Board[home - 2].HasValue &&
                !state.Board[home - 3].HasValue &&
                Matches(state.Board[home - 4], side, ChessKind.Rook) &&
                !IsSquareAttacked(state.Board, home - 1, Opposite(side)) &&
                !IsSquareAttacked(state.Board, home - 2, Opposite(side)))
                Add(moves, from, home - 2, false);
        }

        private static ChessPiece?[] MovedBoard(ChessPosition state, ChessMove move)
        {
            var board = (ChessPiece?[])state.Board.Clone();
            var item = board[move.From];
            if (!item.HasValue) return board;
            board[move.From] = null;
            if (item.Value.Kind == ChessKind.Pawn && move.To == state.EnPassant &&
                !board[move.To].HasValue)
                board[move.To + (item.Value.Side == ChessSide.White ? -8 : 8)] = null;
            board[move.To] = move.Promotion == ChessKind.None ? item :
                new ChessPiece(item.Value.Side, move.Promotion);
            if (item.Value.Kind == ChessKind.King && Math.Abs(move.To - move.From) == 2)
            {
                var rookFrom = move.To > move.From ? move.From + 3 : move.From - 4;
                var rookTo = move.To > move.From ? move.From + 1 : move.From - 1;
                board[rookTo] = board[rookFrom];
                board[rookFrom] = null;
            }
            return board;
        }

        public static List<ChessMove> LegalMoves(ChessPosition state)
        {
            return LegalMoves(state, state.Turn);
        }

        public static List<ChessMove> LegalMoves(ChessPosition state, ChessSide side)
        {
            var legal = new List<ChessMove>();
            if (state.Result != ChessResult.None) return legal;
            foreach (var move in PseudoMoves(state, side))
                if (!IsInCheck(MovedBoard(state, move), side)) legal.Add(move);
            return legal;
        }

        private static bool InsufficientMaterial(ChessPiece?[] board)
        {
            var count = 0;
            var bishopColor = -1;
            var bishopsOnly = true;
            var loneMinor = false;
            for (var square = 0; square < 64; square++)
            {
                var item = board[square];
                if (!item.HasValue || item.Value.Kind == ChessKind.King) continue;
                count++;
                loneMinor = item.Value.Kind == ChessKind.Bishop || item.Value.Kind == ChessKind.Knight;
                if (item.Value.Kind != ChessKind.Bishop) bishopsOnly = false;
                else
                {
                    var color = (File(square) + Rank(square)) % 2;
                    if (bishopColor >= 0 && bishopColor != color) bishopsOnly = false;
                    bishopColor = color;
                }
            }
            return count == 0 || (count == 1 && loneMinor) || (count > 0 && bishopsOnly);
        }

        public static ChessPosition ApplyMove(ChessPosition state, ChessMove move)
        {
            var found = false;
            foreach (var legal in LegalMoves(state))
                if (legal.From == move.From && legal.To == move.To &&
                    legal.Promotion == move.Promotion) { found = true; break; }
            if (!found) throw new InvalidOperationException("Illegal chess move: " + move);

            var next = state.Copy();
            var piece = state.Board[move.From].Value;
            var captured = state.Board[move.To];
            if (piece.Kind == ChessKind.Pawn && move.To == state.EnPassant && !captured.HasValue)
                captured = state.Board[move.To + (piece.Side == ChessSide.White ? -8 : 8)];
            next.Board = MovedBoard(state, move);

            if (piece.Kind == ChessKind.King)
            {
                if (piece.Side == ChessSide.White)
                { next.WhiteKingSide = false; next.WhiteQueenSide = false; }
                else { next.BlackKingSide = false; next.BlackQueenSide = false; }
            }
            if (piece.Kind == ChessKind.Rook ||
                (captured.HasValue && captured.Value.Kind == ChessKind.Rook))
            {
                if (move.From == 0 || move.To == 0) next.WhiteQueenSide = false;
                if (move.From == 7 || move.To == 7) next.WhiteKingSide = false;
                if (move.From == 56 || move.To == 56) next.BlackQueenSide = false;
                if (move.From == 63 || move.To == 63) next.BlackKingSide = false;
            }

            next.EnPassant = piece.Kind == ChessKind.Pawn && Math.Abs(move.To - move.From) == 16 ?
                (move.From + move.To) / 2 : -1;
            next.HalfmoveClock = piece.Kind == ChessKind.Pawn || captured.HasValue ? 0 :
                state.HalfmoveClock + 1;
            if (piece.Side == ChessSide.Black) next.FullmoveNumber++;
            next.Ply++;
            next.Turn = Opposite(piece.Side);
            next.InCheck = IsInCheck(next.Board, next.Turn);
            var key = PositionKey(next);
            next.PositionCounts.TryGetValue(key, out var previous);
            next.PositionCounts[key] = previous + 1;

            var replies = LegalMoves(next, next.Turn);
            if (replies.Count == 0)
            {
                next.Result = next.InCheck ?
                    (piece.Side == ChessSide.White ? ChessResult.WhiteWin : ChessResult.BlackWin) :
                    ChessResult.Draw;
                next.ResultReason = next.InCheck ? "checkmate" : "stalemate";
            }
            else if (next.HalfmoveClock >= 100)
            { next.Result = ChessResult.Draw; next.ResultReason = "fifty-move"; }
            else if (next.PositionCounts[key] >= 3)
            { next.Result = ChessResult.Draw; next.ResultReason = "threefold-repetition"; }
            else if (InsufficientMaterial(next.Board))
            { next.Result = ChessResult.Draw; next.ResultReason = "insufficient-material"; }
            return next;
        }

        public static ChessSnapshot Capture(ChessPosition state)
        {
            var board = new StringBuilder(64);
            foreach (var item in state.Board)
            {
                if (!item.HasValue) { board.Append('.'); continue; }
                char token;
                switch (item.Value.Kind)
                {
                    case ChessKind.King: token = 'k'; break;
                    case ChessKind.Queen: token = 'q'; break;
                    case ChessKind.Rook: token = 'r'; break;
                    case ChessKind.Bishop: token = 'b'; break;
                    case ChessKind.Knight: token = 'n'; break;
                    default: token = 'p'; break;
                }
                board.Append(item.Value.Side == ChessSide.White ? char.ToUpperInvariant(token) : token);
            }
            var keys = new List<string>(state.PositionCounts.Keys);
            keys.Sort(StringComparer.Ordinal);
            var values = new int[keys.Count];
            for (var i = 0; i < keys.Count; i++) values[i] = state.PositionCounts[keys[i]];
            return new ChessSnapshot
            {
                board = board.ToString(), turn = (int)state.Turn,
                whiteKingSide = state.WhiteKingSide, whiteQueenSide = state.WhiteQueenSide,
                blackKingSide = state.BlackKingSide, blackQueenSide = state.BlackQueenSide,
                enPassant = state.EnPassant, halfmoveClock = state.HalfmoveClock,
                fullmoveNumber = state.FullmoveNumber, ply = state.Ply,
                inCheck = state.InCheck, result = (int)state.Result,
                resultReason = state.ResultReason, positionKeys = keys.ToArray(),
                positionValues = values
            };
        }

        public static ChessPosition Restore(ChessSnapshot snapshot)
        {
            if (snapshot == null || snapshot.version != 1 || snapshot.board == null ||
                snapshot.board.Length != 64 || snapshot.turn < 0 || snapshot.turn > 1 ||
                snapshot.enPassant < -1 || snapshot.enPassant > 63 ||
                snapshot.halfmoveClock < 0 || snapshot.fullmoveNumber < 1 || snapshot.ply < 0 ||
                snapshot.result < 0 || snapshot.result > 3 ||
                snapshot.positionKeys == null || snapshot.positionValues == null ||
                snapshot.positionKeys.Length != snapshot.positionValues.Length ||
                snapshot.positionKeys.Length == 0)
                throw new ArgumentException("Invalid Chess save header.");

            var state = new ChessPosition
            {
                Turn = (ChessSide)snapshot.turn,
                WhiteKingSide = snapshot.whiteKingSide,
                WhiteQueenSide = snapshot.whiteQueenSide,
                BlackKingSide = snapshot.blackKingSide,
                BlackQueenSide = snapshot.blackQueenSide,
                EnPassant = snapshot.enPassant, HalfmoveClock = snapshot.halfmoveClock,
                FullmoveNumber = snapshot.fullmoveNumber, Ply = snapshot.ply,
                InCheck = snapshot.inCheck, Result = (ChessResult)snapshot.result,
                ResultReason = snapshot.resultReason ?? ""
            };
            var whiteKings = 0;
            var blackKings = 0;
            for (var square = 0; square < 64; square++)
            {
                var token = snapshot.board[square];
                if (token == '.') continue;
                var side = char.IsUpper(token) ? ChessSide.White : ChessSide.Black;
                ChessKind kind;
                switch (char.ToLowerInvariant(token))
                {
                    case 'k': kind = ChessKind.King; break;
                    case 'q': kind = ChessKind.Queen; break;
                    case 'r': kind = ChessKind.Rook; break;
                    case 'b': kind = ChessKind.Bishop; break;
                    case 'n': kind = ChessKind.Knight; break;
                    case 'p': kind = ChessKind.Pawn; break;
                    default: throw new ArgumentException("Invalid Chess piece token.");
                }
                state.Board[square] = new ChessPiece(side, kind);
                if (kind == ChessKind.King)
                {
                    if (side == ChessSide.White) whiteKings++;
                    else blackKings++;
                }
            }
            if (whiteKings != 1 || blackKings != 1)
                throw new ArgumentException("Chess save must contain one king per side.");
            for (var i = 0; i < snapshot.positionKeys.Length; i++)
            {
                if (string.IsNullOrEmpty(snapshot.positionKeys[i]) ||
                    snapshot.positionValues[i] <= 0 ||
                    state.PositionCounts.ContainsKey(snapshot.positionKeys[i]))
                    throw new ArgumentException("Invalid Chess repetition data.");
                state.PositionCounts.Add(snapshot.positionKeys[i], snapshot.positionValues[i]);
            }
            if (!state.PositionCounts.ContainsKey(PositionKey(state)) ||
                state.InCheck != IsInCheck(state.Board, state.Turn))
                throw new ArgumentException("Inconsistent Chess save position.");
            return state;
        }
    }
}
