// import {getAnalytics} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-analytics.js';
// import {initializeApp} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js';
// import {getAuth} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js';
// import {set, get, getDatabase, query, ref, update, orderByChild, equalTo, onValue} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-database.js';

if (isMobile) {
	cssRoot.style.setProperty('--cursor', 'auto');
}

const inputDiv = ID('input-div');
const msgLvl = ID('msg-lvl');
const scrollBox = ID('scroll-box');

let inputlabel = true;

inputDiv.on('click', () => {
	let bodyMaxScroll = scrollBox.scrollWidth - scrollBox.clientWidth;
	smoothScroll(scrollBox, 'scrollLeft', bodyMaxScroll, 100);
});

inputDiv.on('input', () => {
	let bodyMaxScroll = scrollBox.scrollWidth - scrollBox.clientWidth;
	smoothScroll(scrollBox, 'scrollLeft', bodyMaxScroll, 100);
	let val = inputDiv.innerText;
	if (!val.length) {
		inputlabel = false;
		msgLvl.classList.add('active');
	} else {
		inputlabel = true;
		msgLvl.classList.remove('active');
	}
});

// (async () => {
// 	// Initialize Firebase
// 	const app = initializeApp(firebaseConfig);
// 	const analytics = getAnalytics(app);
// 	const auth = getAuth();
// 	const db = getDatabase();

// })();
