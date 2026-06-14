// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SomnArenaTournament
 * @notice Autonomous tournament system on Somnia L1.
 * Handles stakes, matching, disputes, and automatic prize distribution using custom ERC20 tokens.
 */
contract SomnArenaTournament {
    enum TournamentState { Open, Active, Finalized }
    enum MatchState { Pending, Active, Resolved }

    struct Match {
        uint256 id;
        uint256 tournamentId;
        address player1;
        address player2;
        MatchState state;
        address winner;
    }

    struct Tournament {
        uint256 id;
        address organizer;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 prizeFunds; // initial sponsor / organizer funds
        uint256 totalPrizePool;
        TournamentState state;
        address[] players;
        uint256[] matchIds;
        address winner;
        bool rewardsDistributed;
    }

    address public token; // The custom ERC20 token address
    uint256 public nextTournamentId;
    uint256 public nextMatchId;

    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => Match) public matches;

    event TournamentCreated(
        uint256 indexed tournamentId,
        address indexed organizer,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 prizeFunds
    );
    event PlayerJoined(uint256 indexed tournamentId, address indexed player, uint256 feePaid);
    event MatchStarted(uint256 indexed tournamentId, uint256 indexed matchId, address player1, address player2);
    event MatchResolved(uint256 indexed tournamentId, uint256 indexed matchId, address winner);
    event TournamentFinalized(uint256 indexed tournamentId, address indexed winner, uint256 totalPayout);
    constructor(address _token) {
        token = _token;
    }

    /**
     * @notice Organizer creates a new tournament
     */
    function createTournament(
        uint256 entryFee,
        uint256 maxPlayers,
        uint256 prizeFunds
    ) external returns (uint256) {
        require(maxPlayers >= 2, "Need at least 2 players");
        if (prizeFunds > 0) {
            require(IERC20(token).transferFrom(msg.sender, address(this), prizeFunds), "Sponsor funds transfer failed");
        }

        uint256 tId = nextTournamentId++;
        Tournament storage t = tournaments[tId];
        t.id = tId;
        t.organizer = msg.sender;
        t.entryFee = entryFee;
        t.maxPlayers = maxPlayers;
        t.prizeFunds = prizeFunds;
        t.totalPrizePool = prizeFunds;
        t.state = TournamentState.Open;

        emit TournamentCreated(tId, msg.sender, entryFee, maxPlayers, prizeFunds);
        return tId;
    }

    /**
     * @notice Player joins the tournament and locks their entry fee
     */
    function joinTournament(uint256 tournamentId) external {
        Tournament storage t = tournaments[tournamentId];
        require(t.state == TournamentState.Open, "Tournament not open");
        require(t.players.length < t.maxPlayers, "Tournament full");

        // Verify player hasn't joined already
        for (uint256 i = 0; i < t.players.length; i++) {
            require(t.players[i] != msg.sender, "Already joined");
        }

        if (t.entryFee > 0) {
            require(IERC20(token).transferFrom(msg.sender, address(this), t.entryFee), "Entry fee transfer failed");
            t.totalPrizePool += t.entryFee;
        }

        t.players.push(msg.sender);
        emit PlayerJoined(tournamentId, msg.sender, t.entryFee);

        // Auto transition state to Active if full
        if (t.players.length == t.maxPlayers) {
            t.state = TournamentState.Active;
        }
    }

    /**
     * @notice Starts a new match. Normally initiated by the Organizer or Referee
     */
    function startMatch(
        uint256 tournamentId,
        address player1,
        address player2
    ) external returns (uint256) {
        Tournament storage t = tournaments[tournamentId];
        require(t.state == TournamentState.Active, "Tournament not active");

        uint256 mId = nextMatchId++;
        Match storage m = matches[mId];
        m.id = mId;
        m.tournamentId = tournamentId;
        m.player1 = player1;
        m.player2 = player2;
        m.state = MatchState.Active;
        m.winner = address(0);

        t.matchIds.push(mId);

        emit MatchStarted(tournamentId, mId, player1, player2);
        return mId;
    }

    /**
     * @notice Referee submits the match outcome. Resolves stakes/bracket progress
     */
    function submitResult(uint256 matchId, address winner) external {
        Match storage m = matches[matchId];
        require(m.state == MatchState.Active, "Match not active");
        require(winner == m.player1 || winner == m.player2, "Winner must be a player");

        m.winner = winner;
        m.state = MatchState.Resolved;

        emit MatchResolved(m.tournamentId, matchId, winner);
    }

    /**
     * @notice Finalizes the tournament and awards prizes to the winner
     */
    function finalizeTournament(uint256 tournamentId, address winner) external {
        Tournament storage t = tournaments[tournamentId];
        require(t.state == TournamentState.Active, "Tournament not active");
        require(!t.rewardsDistributed, "Rewards already distributed");

        // Verify the winner is one of the players
        bool isPlayer = false;
        for (uint256 i = 0; i < t.players.length; i++) {
            if (t.players[i] == winner) {
                isPlayer = true;
                break;
            }
        }
        require(isPlayer, "Winner must be a tournament player");

        t.winner = winner;
        t.state = TournamentState.Finalized;
        t.rewardsDistributed = true;

        // Payout to winner
        require(IERC20(token).transfer(winner, t.totalPrizePool), "Prize payout failed");

        emit TournamentFinalized(tournamentId, winner, t.totalPrizePool);
    }

    // View functions for frontend integration
    function getTournamentPlayers(uint256 tournamentId) external view returns (address[] memory) {
        return tournaments[tournamentId].players;
    }

    function getTournamentMatches(uint256 tournamentId) external view returns (uint256[] memory) {
        return tournaments[tournamentId].matchIds;
    }
}
