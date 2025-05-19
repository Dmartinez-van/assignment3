// Game variables
let firstCard, secondCard;
let hasFlippedCard = false;
let lockBoard = true;
let matchedCards = 0;
let clickCount = 0;

// Diffuculty level
const urlParams = new URLSearchParams(window.location.search);
const difficulty = urlParams.get("difficulty") || 1; // default to 1 if not set
numOfMatches = difficulty * 3; // 3 matches for easy, 6 for medium, 9 for hard

// Screen size and game grid variables
let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;

// Timer variables
let startFlag = false;
let timeState = { time: 180 }; // 3 minutes for hard, 2 minutes for medium, 1 minute for easy

// Load game when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded and parsed");

  // Set up the game difficulty buttons
  document.getElementById("easy").addEventListener("click", function () {
    const url = new URL(window.location.href);
    url.searchParams.set("difficulty", 1);
    window.history.pushState({}, "", url);
    window.location.reload();
  });
  document.getElementById("medium").addEventListener("click", function () {
    const url = new URL(window.location.href);
    url.searchParams.set("difficulty", 2);
    window.history.pushState({}, "", url);
    window.location.reload();
  });
  document.getElementById("hard").addEventListener("click", function () {
    const url = new URL(window.location.href);
    url.searchParams.set("difficulty", 3);
    window.history.pushState({}, "", url);
    window.location.reload();
  });
  document.getElementById("reset").addEventListener("click", function () {
    const url = new URL(window.location.href);
    url.searchParams.delete("difficulty");
    window.history.pushState({}, "", url);
    window.location.reload();
  });

  // Setup timer and start/stop button
  const startBtn = document.getElementById("start");
  const timer = document.getElementById("timer");

  let timerMultiplier = difficulty == 1 ? 3 : difficulty == 2 ? 2 : 1;
  timeState.time = timerMultiplier * 60; // 1 minute for easy, 2 minutes for medium, 3 minutes for hard
  let minutes = Math.floor(timeState.time / 60);
  let seconds = timeState.time % 60;
  timer.innerHTML = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  let interval;
  startBtn.addEventListener("click", function () {
    if (!startFlag) {
      // Start the game, enable the board
      startFlag = true;
      lockBoard = false;

      // Remove overlay
      const overlay = document.getElementById("overlay");
      overlay.style.display = "none";

      // Enable powerups
      enablePowerups();

      // Start the timer
      // Condition for when timer hits 0 - user loses
      // Else, count down the timer
      // If user clicks stop, stop the timer and reset the time and board
      interval = setInterval(() => {
        if (timeState.time <= 0) {
          clearInterval(interval);
          alert("Time's up! You lose!");
          location.reload();
        } else {
          console.log("Time left: " + timeState.time);
          timeState.time--;
          minutes = Math.floor(timeState.time / 60);
          seconds = timeState.time % 60;
          milliseconds = Math.floor((timeState.time % 1) * 1000);
          timer.innerHTML = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        }
      }, 1000);
      startBtn.textContent = "Stop";
    } else {
      startFlag = false;
      lockBoard = true;

      // Add back the overlay
      const overlay = document.getElementById("overlay");
      overlay.style.display = "block";

      clearInterval(interval);
      timeState.time = timerMultiplier * 60; // 1 minute for easy, 2 minutes for medium, 3 minutes for hard
      let minutes = Math.floor(timeState.time / 60);
      let seconds = timeState.time % 60;
      timer.innerHTML = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
      startBtn.textContent = "Start";
      disablePowerups();
    }
  });

  // Setup listener for the number of clicks on the game grid
  const gameGrid = document.getElementById("game_grid");
  const clickCountDisplay = document.getElementById("click_count");
  gameGrid.addEventListener("click", function (event) {
    if (
      !lockBoard &&
      (event.target.classList.contains("card") ||
        event.target.classList.contains("back_face"))
    ) {
      clickCount++;
      clickCountDisplay.innerHTML = clickCount;
    }
  });

  // Setup the number of matches made
  const matches = document.getElementById("matches");
  matches.innerHTML = matchedCards;

  // Setup the number of matches left to be made
  const matchesLeft = document.getElementById("matches_left");
  matchesLeft.innerHTML = numOfMatches - matchedCards;

  createGame(Number(difficulty));
  addPowerup1();
  addPowerup2();
  addPowerup3();
});

async function createGame(difficulty = 1) {
  const length = difficulty * 6;
  const pokeIds = new Array(length);

  // Create an array of Pokemon IDs based on the difficulty level
  // 1 = easy, 2 = medium, 3 = hard
  if (difficulty === 1) {
    for (let i = 0; i < 3; i++) {
      const pokeId = Math.floor(Math.random() * 151) + 1;
      pokeIds[i] = pokeId;
      pokeIds[i + 3] = pokeId;
    }
  } else if (difficulty === 2) {
    for (let i = 0; i < 6; i++) {
      const pokeId = Math.floor(Math.random() * 151) + 1;
      pokeIds[i] = pokeId;
      pokeIds[i + 6] = pokeId;
    }
  } else if (difficulty === 3) {
    for (let i = 0; i < 9; i++) {
      const pokeId = Math.floor(Math.random() * 151) + 1;
      pokeIds[i] = pokeId;
      pokeIds[i + 9] = pokeId;
    }
  }

  // shuffle the array
  for (let i = pokeIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pokeIds[i], pokeIds[j]] = [pokeIds[j], pokeIds[i]];
  }

  const pokemonData = await getPokemonData(pokeIds);

  // Create a card for each Pokemon
  pokemonData.forEach((pokemon) => {
    createCard(pokemon);
  });

  attachListeners();

  return;
}

// Use 'card_template' element to create a new card
function createCard(pokemon) {
  const cardTemplate = document.getElementById("card_template");
  const newCard = cardTemplate.content.cloneNode(true); // clone the template content, not the template itself
  const img = newCard.querySelector(".front_face");
  img.src = pokemon.sprites.other["official-artwork"].front_default;
  img.alt = pokemon.name;
  document.getElementById("game_grid").appendChild(newCard);
}

async function getPokemonData(pokeIds) {
  const pokemonData = [];
  for (const pokeId of pokeIds) {
    let success = false;
    let retries = 0;
    let data;
    while (!success && retries < 5) {
      try {
        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${pokeId}`
        );
        if (response.status === 429) {
          console.log("Too many requests, retrying...");
          // Too Many Requests, wait and retry
          const delay = Math.pow(2, retries) * 200; // exponential backoff: 200ms, 400ms, 800ms, etc.
          await new Promise((resolve) => setTimeout(resolve, delay));
          retries++;
          continue;
        }
        data = await response.json();
        success = true;
      } catch (error) {
        // Network or other error, wait and retry
        const delay = Math.pow(2, retries) * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
      }
    }
    if (success) {
      pokemonData.push(data);
    } else {
      alert("Failed to fetch Pokémon data after multiple attempts.");
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 40)); // 40ms delay between requests
  }
  const loading = document.getElementById("loading");
  loading.style.display = "none";

  return pokemonData;
}

function handleCardClick(event) {
  const card = event.currentTarget;
  if (lockBoard) return; // prevent clicking while board is locked

  // check if card is already flipped
  if (card.classList.contains("flip")) return;

  // toggle card class
  card.classList.toggle("flip");
  if (!firstCard && !lockBoard) {
    // first click
    firstCard = card.querySelector(".front_face");
    hasFlippedCard = true;
  } else if (
    hasFlippedCard &&
    !lockBoard &&
    firstCard !== card.querySelector(".front_face")
  ) {
    secondCard = card.querySelector(".front_face");

    if (firstCard.src === secondCard.src) {
      // cards match
      matchedCards++;
      // update the number of matches made
      const matchCountDisplay = document.getElementById("matches");
      matchCountDisplay.innerHTML = matchedCards;
      // update the number of matches left to be made
      const matchesLeft = document.getElementById("matches_left");
      matchesLeft.innerHTML = numOfMatches - matchedCards;

      // check if all matches are made
      if (matchedCards === difficulty * 3) {
        fireConfetti();
        setTimeout(() => {
          // location.reload();
          alert("You win!");
        }, 500);
      }
      // remove event listeners from matched cards
      firstCard.parentElement.removeEventListener("click", handleCardClick);
      secondCard.parentElement.removeEventListener("click", handleCardClick);
      firstCard = null;
      secondCard = null;
      hasFlippedCard = false;
    } else {
      // cards do not match
      lockBoard = true;
      setTimeout(() => {
        firstCard.parentElement.classList.remove("flip");
        secondCard.parentElement.classList.remove("flip");
        firstCard = null;
        secondCard = null;
        hasFlippedCard = false;
        lockBoard = false;
      }, 1000);
    }
  }
}

function attachListeners() {
  // Add event listeners to each card
  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("click", handleCardClick);
  });
}

function addPowerup1() {
  document.getElementById("powerup1").addEventListener("click", function () {
    console.log("Powerup 1 activated!");
    // Powerup 1: Flip all cards
    document.querySelectorAll(".card").forEach(function (card) {
      card.classList.add("flip");

      // Remove the flip class after a short delay
      setTimeout(() => {
        card.classList.remove("flip");
      }, 650);
    });

    // Disable the powerup button
    document.getElementById("powerup1").disabled = true;
  });
}

function addPowerup2() {
  document.getElementById("powerup2").addEventListener("click", function () {
    console.log("Powerup 2 activated!");
    // Powerup 2: Add 30 seconds to the timer
    timeState.time += 30;
    console.log("ADDED 30 seconds to the timer: ", timeState.time);

    // Disable the powerup button
    document.getElementById("powerup2").disabled = true;
  });
}

function addPowerup3() {
  document.getElementById("powerup3").addEventListener("click", function () {
    console.log("Powerup 3 activated!");
    // Powerup 3: Show one matching pair of cards
    const cards = document.querySelectorAll(".card");
    const firstCard = cards[Math.floor(Math.random() * cards.length)];
    const secondCard = Array.from(cards).find(
      (card) =>
        card !== firstCard &&
        card.querySelector(".front_face").src ===
          firstCard.querySelector(".front_face").src
    );
    if (secondCard) {
      firstCard.classList.add("flip");
      secondCard.classList.add("flip");

      // increase the number of matches made
      matchedCards++;
      const matchCountDisplay = document.getElementById("matches");
      matchCountDisplay.innerHTML = matchedCards;

      // update the number of matches left to be made
      const matchesLeft = document.getElementById("matches_left");
      matchesLeft.innerHTML = numOfMatches - matchedCards;
      // check if all matches are made
      if (matchedCards === difficulty * 3) {
        fireConfetti();
        setTimeout(() => {
          // location.reload();
          alert("You win!");
        }, 500);
      }
    }
  });
}

function disablePowerups() {
  // Reset powerup buttons
  document.getElementById("powerup1").disabled = true;
  document.getElementById("powerup2").disabled = true;
  document.getElementById("powerup3").disabled = true;
}

function enablePowerups() {
  console.log("Powerups enabled!");
  // Reset powerup buttons
  document.getElementById("powerup1").disabled = false;
  document.getElementById("powerup2").disabled = false;
  document.getElementById("powerup3").disabled = false;
}

function fireConfetti() {
  confetti({
    spread: 360,
    ticks: 200,
    gravity: 1,
    decay: 0.94,
    startVelocity: 30,
    particleCount: 100,
    scalar: 3,
    shapes: ["image"],
    shapeOptions: {
      image: [
        {
          src: "https://particles.js.org/images/fruits/apple.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/avocado.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/banana.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/berries.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/cherry.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/grapes.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/lemon.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/orange.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/peach.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/pear.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/pepper.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/plum.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/star.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/strawberry.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/watermelon.png",
          width: 32,
          height: 32,
        },
        {
          src: "https://particles.js.org/images/fruits/watermelon_slice.png",
          width: 32,
          height: 32,
        },
      ],
    },
  });
}
