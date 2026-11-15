/* =====================================================================
   CAHIER DE PROBLÈMES — cahier.js
   Les problèmes du cahier d'évaluation d'Échecs et Mad (800 à 1300 Elo), dans l'ordre du cahier.
   n      : numéro dans le cahier imprimé (le 21, erroné, est absent)
   elo    : palier de la page
   fen    : position (pièces, trait, roques, prise en passant)
   lines  : la ou les suites du corrigé, coup par coup (départ + arrivée) ; le premier coup est celui de l'élève
   theme  : ce que la suite obtient, affiché une fois le problème résolu
   ===================================================================== */
window.CAHIER_PROBLEMES = [
  {"n":1,"elo":800,"fen":"r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq -","lines":[["h5f7"]],"theme":"mat en 1"},
  {"n":2,"elo":800,"fen":"4k3/R7/1R6/8/4K3/8/8/8 w - -","lines":[["b6b8"]],"theme":"mat en 1"},
  {"n":3,"elo":800,"fen":"4k3/R7/4K3/8/8/8/8/8 w - -","lines":[["a7a8"]],"theme":"mat en 1"},
  {"n":4,"elo":800,"fen":"7k/8/5K2/8/3Q4/8/8/8 w - -","lines":[["f6g6","h8g8","d4d8"],["f6f7","h8h7","d4h4"]],"theme":"mat en 2"},
  {"n":5,"elo":800,"fen":"3R2rk/6b1/3p1p1p/2pq1N2/5PQ1/1p5P/6PK/8 w - -","lines":[["g4g7"]],"theme":"mat en 1"},
  {"n":6,"elo":800,"fen":"1r3bk1/2NK1pp1/2n5/1N3P2/8/7R/7P/8 b - -","lines":[["c6e5"]],"theme":"mat en 1"},
  {"n":7,"elo":800,"fen":"6B1/8/2R2b1k/7p/1p1q2bP/8/PQ6/1K6 b - -","lines":[["d4b2"]],"theme":"mat en 1"},
  {"n":8,"elo":800,"fen":"8/2p5/2B2kp1/p1P4p/P4n1K/6P1/5P1P/8 b - -","lines":[["g6g5"]],"theme":"mat en 1"},
  {"n":9,"elo":800,"fen":"5rk1/p1Q4p/2p3p1/3p3q/3Bb1N1/2P5/PP4PP/4b2K w - -","lines":[["c7g7"]],"theme":"mat en 1"},
  {"n":10,"elo":900,"fen":"2kr3r/p2p1pbp/1np3p1/5b2/8/2PQ2B1/PP3PPP/R2R2K1 w - -","lines":[["d3a6"]],"theme":"mat en 1"},
  {"n":11,"elo":900,"fen":"r4rk1/pp3pp1/2pp4/3N3q/4P3/8/PPP3P1/1K5R w - -","lines":[["d5e7","g8h7","h1h5"]],"theme":"mat en 2"},
  {"n":12,"elo":900,"fen":"r6r/1N3pk1/pp2p1p1/2p1N3/5n2/2PP4/PP3PPP/R4RK1 b - -","lines":[["f4e2","g1h1","h8h2","h1h2","a8h8"]],"theme":"mat en 3"},
  {"n":13,"elo":900,"fen":"2kBQr1R/1b1p4/pp1bp3/4n3/P1p1P3/2N5/1PP3PP/5BK1 b - -","lines":[["d6c5","g1h1","f8f1"]],"theme":"mat en 2"},
  {"n":14,"elo":900,"fen":"6k1/1B3p1p/5bp1/Q7/5r2/P7/1R3qPP/4R2K w - -","lines":[["b2f2"]],"theme":"gagnant, mat à terme"},
  {"n":15,"elo":900,"fen":"r2q2rk/6bp/p3B1p1/1p2N3/3P2P1/B1P4R/P6P/6K1 w - -","lines":[["e5g6"]],"theme":"mat en 1"},
  {"n":16,"elo":900,"fen":"1Q6/2rkb1p1/1p1p3p/2q1P3/2P5/8/P4nPP/R1B2RK1 b - -","lines":[["f2h3","g1h1","c5g1","f1g1","h3f2"]],"theme":"mat en 3"},
  {"n":17,"elo":900,"fen":"rn1qr1nQ/3bk2N/4pp2/2bpP3/8/2N5/P4PPP/R4RK1 w - -","lines":[["h8g7"]],"theme":"mat en 1"},
  {"n":18,"elo":900,"fen":"5rk1/6p1/1R6/2ppNqp1/1P1P4/2P4P/4Q1PK/r6R b - -","lines":[["f5f4","g2g3","f4f2","e2f2","f8f2"]],"theme":"mat en 3"},
  {"n":19,"elo":1000,"fen":"8/8/6Q1/2pbk3/4n3/4q2P/P5P1/5R1K b - -","lines":[["e4g3"]],"theme":"gagnant, mat à terme"},
  {"n":20,"elo":1000,"fen":"3r2k1/pp3pbp/2n1b1p1/2p5/4P3/2P3P1/PP3PBP/2B1NK2 b - -","lines":[["e6c4","f1g1","d8d1"]],"theme":"gain de matériel"},
  {"n":22,"elo":1000,"fen":"8/2p2pk1/1p4p1/p1pP1B2/2P2P2/1P4KP/P2R1Q1r/1q6 b - -","lines":[["h2f2","f5b1","f2d2"]],"theme":"gain de matériel"},
  {"n":23,"elo":1000,"fen":"2Q5/8/8/1k1K4/2n5/p1P5/8/8 b - -","lines":[["c4b6"]],"theme":"gagnant, mat à terme"},
  {"n":24,"elo":1000,"fen":"5Q2/8/2k5/8/2n2KP1/p7/8/q7 b - -","lines":[["a1f1"]],"theme":"gagnant, mat à terme"},
  {"n":25,"elo":1000,"fen":"r2qkb1r/2pn2pp/p1np1p2/1p1Q4/4P3/1B3b2/PPP2PPP/RNB3KR w kq -","lines":[["d5f7"]],"theme":"mat en 1"},
  {"n":26,"elo":1000,"fen":"k2r3r/1p3ppp/5n2/2Q5/5B2/8/PPP2PPK/RN1q4 w - -","lines":[["c5a3"],["c5a5"]],"theme":"mat en 1"},
  {"n":27,"elo":1000,"fen":"r1b5/p1k1pQbp/1n2P1p1/2p1q3/8/2NB3P/PP4P1/R1B4K w - -","lines":[["c1f4","e5f4","f7f4"]],"theme":"gain décisif"},
  {"n":28,"elo":1100,"fen":"r1b1qk2/ppp1p1bQ/3p2P1/4nr2/4N3/P3Pn2/1PPPBP2/R1BK3R w - -","lines":[["h7h8","g7h8","h1h8","f8g7","h8e8"]],"theme":"gain de matériel"},
  {"n":29,"elo":1100,"fen":"8/R7/8/1B3k2/Pb2p3/8/2b3P1/6K1 b - -","lines":[["b4c5","g1f1","c5a7"]],"theme":"avantage net"},
  {"n":30,"elo":1100,"fen":"r1b2rk1/pp3ppp/4p3/3pP3/1n1q1P2/3B2P1/PP5P/R1BQ1K1R w - -","lines":[["d3h7","g8h7","d1d4"]],"theme":"gain de matériel"},
  {"n":31,"elo":1100,"fen":"8/p1r1k1pp/3Rp3/N1p1P3/3n4/PP2K1P1/7P/8 b - -","lines":[["d4f5","e3e4","f5d6"]],"theme":"gain de matériel"},
  {"n":32,"elo":1100,"fen":"3r2k1/2r3pp/p1P2p2/1p1Pp3/4P3/q4P2/B5PP/2RR3K w - -","lines":[["d5d6","a3a2","d6c7"]],"theme":"gain de matériel"},
  {"n":33,"elo":1100,"fen":"5rk1/2p4p/2B1pp2/p7/P4Q2/1q4PP/8/R5K1 b - -","lines":[["b3b6","g1h1","b6c6"]],"theme":"avantage net"},
  {"n":34,"elo":1100,"fen":"r3k1r1/pp1nqpR1/2p1p2B/4P2P/4Q3/5P2/PPP5/2KR4 b q -","lines":[["g8g7","h6g7","e7g5"]],"theme":"avantage net"},
  {"n":35,"elo":1100,"fen":"R7/5pk1/2pp4/1p2p1pp/3PPn1q/1PP3QP/1P3PP1/6K1 b - -","lines":[["f4e2","g1h2","e2g3"]],"theme":"gain de matériel"},
  {"n":36,"elo":1100,"fen":"8/7k/pp4r1/2pR1Q2/7q/P4P2/1P4P1/6K1 b - -","lines":[["h4e1","g1h2","e1g3","h2h1","g3g2"]],"theme":"mat en 3"},
  {"n":37,"elo":1200,"fen":"8/p2Q2pk/2p2r1p/8/3P2P1/2P1bPq1/PP4R1/5R1K b - -","lines":[["g3h3","g2h2","h3f1"]],"theme":"mat en 2"},
  {"n":38,"elo":1200,"fen":"3r2k1/1p3pp1/2p4p/p1q5/P1B1Pp2/1PQ2P1P/n1Pr1P2/2R2RK1 w - -","lines":[["c4f7","g8f7","c3c5"]],"theme":"gain de matériel"},
  {"n":39,"elo":1200,"fen":"8/8/7p/6P1/7P/3kp3/5K2/8 w - -","lines":[["f2e1"]],"theme":"gagnant, mat à terme"},
  {"n":40,"elo":1200,"fen":"2r2rk1/pp2ppbp/3p2p1/5b2/3qN3/3B3P/PP1B1PP1/RQ3RK1 b - -","lines":[["f5e4","d3e4","d4d2"]],"theme":"gain de matériel"},
  {"n":41,"elo":1200,"fen":"4rrk1/1p6/p2q2p1/8/7R/3Q1b2/PPP2P2/4R1K1 w - -","lines":[["e1e8","f8e8","d3f3"]],"theme":"gain de matériel"},
  {"n":42,"elo":1200,"fen":"8/8/8/5pK1/R3br2/P1Rnk3/7P/8 w - -","lines":[["c3d3","e3d3","g5f4"],["c3d3","e4d3","a4f4"]],"theme":"gain de matériel"},
  {"n":43,"elo":1200,"fen":"1Q1Q4/p4pk1/3p4/2p2p2/P1Pp1K2/3q2P1/8/8 b - -","lines":[["d3e4","f4g5","e4g4"]],"theme":"mat en 2"},
  {"n":44,"elo":1200,"fen":"6k1/5p2/p3p1pp/1pb5/1N1r4/P2R4/2r2PPP/R5K1 w - -","lines":[["d3d4","c5d4","b4c2"]],"theme":"avantage net"},
  {"n":45,"elo":1200,"fen":"5R2/pb4kp/4Q1p1/1p6/1P6/P3pq1P/4R3/6K1 b - -","lines":[["f3h1"]],"theme":"mat en 1"},
  {"n":46,"elo":1300,"fen":"8/ppp5/2nk1q2/8/2Pp4/8/PP1B2Q1/2K5 w - -","lines":[["g2d5","d6e7","d2g5"]],"theme":"gain de matériel"},
  {"n":47,"elo":1300,"fen":"r6r/2p5/p4RBp/4R3/2kp1Bb1/P2n4/6PP/7K w - -","lines":[["f6c6","c4b3","g6d3"]],"theme":"gain de matériel"},
  {"n":48,"elo":1300,"fen":"2b3k1/p4p1p/1pr2pn1/q2p1Q2/3P4/1P3N2/P4PPP/1B2R1K1 w - -","lines":[["e1e8","g8g7","e8c8"]],"theme":"gain de matériel"},
  {"n":49,"elo":1300,"fen":"r3k1nr/pp2qppp/2n1p3/1N1pP3/8/7P/P2Q1PP1/1R1K1B1R w kq -","lines":[["b5d6","e8f8","b1b7"]],"theme":"gain de matériel"},
  {"n":50,"elo":1300,"fen":"rn4k1/ppb2ppp/2pq1p2/7B/3P4/2P1r1PP/PP3PKN/R2Q1R2 b - -","lines":[["e3g3","f2g3","d6g3","g2h1","g3h2"]],"theme":"mat en 3"},
  {"n":51,"elo":1300,"fen":"3R4/4nk1p/1p3q2/1p2p3/8/3P1Q2/5bPK/r7 w - -","lines":[["d8f8","f7f8","f3f6"]],"theme":"gain de matériel"},
  {"n":52,"elo":1300,"fen":"r5k1/1p1P2bp/pQ4p1/4p3/3nP1n1/2N3P1/P4r2/2RR2K1 b - -","lines":[["d4f3","g1h1","f2h2"]],"theme":"mat en 2"},
  {"n":53,"elo":1300,"fen":"2r4k/p3p2p/5bp1/2B5/2R2P2/1P5P/r1P3P1/4R1K1 b - -","lines":[["c8c5","c4c5","f6d4"]],"theme":"gain de matériel"},
  {"n":54,"elo":1300,"fen":"r3r2k/pp3p1p/1np1pqpQ/3n4/3P4/2PB1PN1/PP3P1P/2KR2R1 w - -","lines":[["g3h5","e8g8","h5f6"]],"theme":"gain de matériel"}
];
