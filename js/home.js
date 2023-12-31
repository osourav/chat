import {getAnalytics} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-analytics.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js';
import {set, get, getDatabase, query, ref, update, orderByChild, equalTo, onValue, onChildChanged, onChildAdded, child, remove} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-database.js';

let currentSearchSelection = null; // for search user click detials

// clear all local datas
// clearLocal();

window.onload = async () => {
	// Initialize Firebase
	const app = initializeApp(firebaseConfig);
	const analytics = getAnalytics(app);
	const auth = getAuth();
	const db = getDatabase();

	const dbRef = ref(db, `users/${USER_ID}`);

	// when local data is not available
	// if (!data) {
	// 	try {
	// 		data = (await get(dbRef)).val();
	// 		setupFriends();
	// 	} catch (e) {
	// 		location.reload();
	// 	}
	// }

	// stop page loding
	pageLoad.classList.remove('active');

	setInterval(async () => {
		if (user_active && data.friends) {
			try {
				const d = Date.now();

				await update(dbRef, {
					onlineStatus: d,
				});

				const borders = document.querySelectorAll('.contact-icon');
				let index = 0;

				for (const key in data.friends.saved) {
					const ps = await get(child(dbRef, `friends/saved/${key}/profileStatis`));

					const oldStatus = data.friends.saved[key].profileStatis;
					const newStatus = ps.val();

					if (newStatus - oldStatus > 0) {
						console.log('Update Friend Profile');
						const friend = (await get(ref(db, `users/${key}`))).val();

						update(child(dbRef, `friends/saved/${key}`), {
							images: friend.images,
							about: friend.info.about,
							name: friend.info.name,
							profileStatis: newStatus,
						});

						data.friends.saved[key].images = friend.images;
						data.friends.saved[key].about = friend.info.about;
						data.friends.saved[key].name = friend.info.name;
						data.friends.saved[key].profileStatis = newStatus;

						setupFriends();
					}
				}

				// update my time in friends list
				for (const key in data.friends.saved) {
					await update(ref(db, `users/${key}/friends/saved/${USER_ID}`), {
						onlineStatus: d,
					});

					// update online status in my chat list
					const onSt = await get(ref(db, `users/${USER_ID}/friends/saved/${key}/onlineStatus`));

					const oldStatus = data.friends.saved[key].onlineStatus;
					const newStatus = onSt.val();

					data.friends.saved[key].onlineStatus = newStatus;

					if (newStatus - oldStatus > UPDATE_DELAY - 10000) {
						borders[index].classList.add('online');
						if (currentChatOpenId == key) {
							ID('pf-status').classList.add('active');
							ID('pf-status').innerText = 'Online';
						}
					} else {
						borders[index].classList.remove('online');
						if (currentChatOpenId == key) {
							ID('pf-status').classList.remove('active');
							ID('pf-status').innerText = formatTime(newStatus);
						}
					}
					index++;
				}

				data.onlineStatus = d;

				console.log('Updated status');
			} catch (error) {
				console.log(error);
			}
		}
	}, UPDATE_DELAY);

	try {
		async function update_friends_receive(snapshot) {
			if (user_active) {
				const val = snapshot.val();

				await update(child(dbRef, `friends/saved/`), {
					[val.id]: val,
				});

				await remove(child(dbRef, `friends/receive/${val.id}`));
				data.friends.saved[val.id] = val;
				setupFriends();
			}
		}
		async function update_chats_receive(snapshot) {
			if (user_active) {
				const object = snapshot.val();
				let refr = snapshot.ref._path.pieces_;
				refr = refr[refr.length - 1];

				for (const key in object) {
					for (const k in object[key]) {
						await update(child(dbRef, `chats/saved/${refr}/${key}`), {
							[k]: object[key][k],
						});
						await remove(child(dbRef, `chats/receive/${refr}/${key}`));

						data.friends.saved[refr].lastChatTime = k * 1;
						data.friends.saved[refr].lastMessage = object[key][k].message;

						if (!data.chats.receive[refr]) {
							data.chats.receive[refr] = {};
							data.chats.receive[refr][key] = {
								[k]: object[key][k],
							};
						} else {
							data.chats.receive[refr][key] = {
								...data.chats.receive[refr][key],
								[k]: object[key][k],
							};
						}
					}
				}
				if (currentChatOpenId == refr) {
					const allMessages = getAllMessages(refr);
					setUpMessages(allMessages);
				}

				setupFriends();
			}
		}

		onChildAdded(child(dbRef, `friends/receive`), async (snapshot) => {
			update_friends_receive(snapshot);
		});

		// update when any one message me
		onChildAdded(child(dbRef, `chats/receive`), async (snapshot) => {
			update_chats_receive(snapshot);
		});

		document.addEventListener(
			'visibilitychange',
			async () => {
				if (document.visibilityState != 'hidden') {
					user_active = true;
					get(child(dbRef, `friends/receive`), async (snapshot) => {
						console.log(snapshot.val());
						update_friends_receive(snapshot);
					});
					get(child(dbRef, `friends/receive`), async (snapshot) => {
						update_friends_receive(snapshot);
					});
				}
			},
			false
		);
	} catch (error) {
		console.log(error);
	}

	/* -------------- default setup -------------- */
	// profile image
	if (data) {
		if (data.images && (data.images.high || data.images.low)) {
			profileImg.src = data.images.high;
			profielImage.classList.add('active');
		}
		if (data.info) {
			nameInput.value = data.info.name;
			aboutInput.value = data.info.about;
		}
	}

	setupFriends();

	const toggleCancleNewBtn = ID('toggle-cancle-new-btn');
	const indexHeader = ID('index-header');
	const scrollBox = ID('scroll-box');
	const profileBack = ID('profile-back');
	// const wrapContacts = ID("wrap-contacts");
	const profileBtn = ID('profile-btn');

	toggleCancleNewBtn.on(() => {
		indexHeader.classList.toggle('active');
	});

	// defualt chat open off
	let bodyMaxScroll = scrollBox.scrollHeight - scrollBox.clientHeight;
	document.body.classList.remove('active');

	profileBack.on(() => {
		smoothScroll(scrollBox, 'scrollLeft', -bodyMaxScroll, 100);
		currentChatOpenId = 0;
	});

	profileBtn.addEventListener('click', () => {
		window.location.replace('profile.html');
	});

	/* 
	-------------------------------------------------------------------------------------



	--------------------------------- Profile -------------------------------------------



	-------------------------------------------------------------------------------------
*/

	// initial run
	userID.innerText = USER_ID;
	if (data && data.info.name) nameInput.value = data.info.name;
	if (data && data.info.about) aboutInput.value = data.info.about;

	// update profile information
	proUpdateButton.addEventListener(
		'click',
		debounce(async () => {
			uploadProcess.classList.add('active');
			const name = nameInput.value;
			const about = aboutInput.value;
			await update(child(dbRef, `info`), {
				name: name,
				about: about,
			});

			for (const key in data.friends.saved) {
				await update(ref(db, `users/${key}/friends/saved/${USER_ID}`), {
					profileStatis: Date.now(),
				});
			}

			data.info.name = name;
			data.info.about = about;

			uploadProcess.classList.remove('active');
		}, 500)
	);

	// logout button
	logoutButton.addEventListener('click', async () => {
		clearLocal();
	});

	// delete image button
	imageDelete.addEventListener('click', async () => {
		try {
			uploadProcess.classList.add('active');
			await update(child(dbRef, `images`), {
				high: '',
				low: '',
			});
			for (const key in data.friends.saved) {
				await update(ref(db, `users/${key}/friends/saved/${USER_ID}`), {
					profileStatis: Date.now(),
				});
			}
			data.images.high = '';
			data.images.low = '';
			profileImg.src = '';
			profielImage.classList.remove('active');
		} catch (error) {
			console.log(error);
		}
		uploadProcess.classList.remove('active');
	});

	/* ----------------- upload profile image ------------------ */
	doneSelectedImage.addEventListener(
		'click',
		async () => {
			createImageData();
			try {
				await update(dbRef, {
					profileStatis: Date.now(),
					images: {
						high: IMAGE_URL.high,
						low: IMAGE_URL.low,
					},
				});

				for (const key in data.friends.saved) {
					await update(ref(db, `users/${key}/friends/saved/${USER_ID}`), {
						profileStatis: Date.now(),
					});
				}
			} catch (error) {
				console.log(error);
			}

			profileImg.src = IMAGE_URL.high;
			data.images.high = IMAGE_URL.high;
			data.images.low = IMAGE_URL.low;
			profielImage.classList.add('active');
			uploadProcess.classList.remove('active');
		},
		true
	);

	/* ------------- user profile setting ------------- */
	profileOpenClose.addEventListener('click', () => {
		myProfileAndFindUser.classList.toggle('show');
	});
	profielImage.addEventListener('click', () => {
		myProfileAndFindUser.classList.add('one');
		myProfileAndFindUser.classList.remove('two');
	});
	closeProfile.addEventListener('click', () => {
		myProfileAndFindUser.classList.remove('one');
	});
	searchIcon.addEventListener('click', async () => {
		myProfileAndFindUser.classList.remove('one');
		myProfileAndFindUser.classList.add('two');
	});

	closeSearch.addEventListener('click', () => {
		myProfileAndFindUser.classList.remove('two');
		currentSearchSelection = null;
		userSearchInput.value = '';
		searchUserName.innerText = 'User Name';
		userAddAndInfo.classList.remove('active');
		allSearchResult.innerHTML = '';
		searchUserImage.url = '';
		searchIcon.classList.remove('active');
	});

	// copy buttton
	inProfileId.addEventListener('click', async () => {
		await navigator.clipboard.writeText(userID.innerText);
	});

	profileViewId.addEventListener('click', async () => {
		await navigator.clipboard.writeText(profileViewIdValue.innerText);
	});

	/* ------------ search in user datas  ----------------*/
	// search input
	userSearchInput.addEventListener(
		'input',
		debounce(() => {
			let ID = userSearchInput.value;
			allSearchResult.innerHTML = '';

			if (ID.length > 8) userSearchInput.value = ID.substring(0, 8);
			else if (ID.length < 5) return;

			manageSearchUsers(ID);
		}, 500)
	);

	// paste button
	pasteButton.addEventListener(
		'click',
		debounce(async () => {
			const text = await navigator.clipboard.readText();
			const ID = text.substring(0, 8);
			userSearchInput.value = ID;
			allSearchResult.innerHTML = '';
			manageSearchUsers(ID);
		}, 500)
	);

	// search and manage users
	async function manageSearchUsers(ID) {
		if (ID.length < 5) return;

		ID = ID.toUpperCase();

		const newRef = query(ref(db, 'users'), orderByChild('id'), equalTo(ID));
		const result = objectToArray((await get(newRef)).val());

		let strElement = '';

		[...result].forEach(({id, info}) => {
			const isYou = USER_ID === id;
			const isFriend = isMyFriend(data.friends, id);
			strElement += `
			<div class="search-user ${isYou || isFriend ? 'have' : ''}">
				 <i class="sbi-user"></i>
			<div class="user-name">${isYou ? 'You' : info.name ? info.name : 'Guest'}</div>
			<p>ID</p>
			<div class="user-id">${id}</div>
			</div>
	  `;
		});

		allSearchResult.innerHTML = strElement;
		const allFindUsers = document.querySelectorAll('.search-user');
		allFindUsers.forEach((findUser, i) => {
			findUser.addEventListener('click', async () => {
				removeClass(allFindUsers);
				addClass(findUser);

				const {id, images, info} = result[i];

				// set in search view elements
				userAddAndInfo.classList.add('active');
				userAddAndInfo.classList.remove('have');
				friendOrNot.classList = [];

				if (USER_ID === id) {
					userAddAndInfo.classList.add('have');
					friendOrNot.classList.add('sbi-user');
				} else if (isMyFriend(data.friends, id)) {
					userAddAndInfo.classList.add('have');
					friendOrNot.classList.add('sbi-user-check');
				} else {
					friendOrNot.classList.add('sbi-user');
				}
				searchUserName.innerText = info.name || id;

				// add image url when have image
				if (images && images.high != '') {
					searchIcon.classList.remove('active');
					searchUserImage.src = images.high;
					searchIcon.classList.add('active');
				}
				currentSearchSelection = {...result[i]};
			});
		});
	}

	// when add an new friend
	addUserBtn.addEventListener(
		'click',
		debounce(async () => {
			if (!currentSearchSelection) return;
			uploadProcess.classList.add('active');
			const {id, images, info, onlineStatus, profileStatis} = currentSearchSelection;
			console.log(data.friends);

			try {
				const d = Date.now();
				const opDate = getOptimizeDate();

				const firstChat = {
					type: 'both',
					message: 'Welcome to Live Chat!',
				};
				const friendInfo = {
					about: info.about,
					creationDate: info.creationDate,
					id: id,
					name: info.name || 'Guest',
					os: info.os,
					onlineStatus: onlineStatus,
					lastChatTime: d,
					lastMessage: firstChat.message,
					profileStatis: profileStatis,
					images: {
						high: images.high,
						low: images.low,
					},
				};

				// add in friend's friends list
				await update(ref(db, `users/${id}/friends/receive`), {
					[USER_ID]: {
						about: data.info.about,
						creationDate: data.info.creationDate,
						id: USER_ID,
						name: data.info.name || 'Guest',
						os: data.info.os,
						onlineStatus: data.onlineStatus,
						lastChatTime: d,
						lastMessage: firstChat.message,
						profileStatis: data.profileStatis,
						images: {
							high: data.images.high,
							low: data.images.low,
						},
					},
				});

				// add in friends list
				await update(child(dbRef, `friends/saved`), {
					[id]: friendInfo,
				});

				// set first chat in my chat list
				await update(child(dbRef, `chats/receive/${id}/${opDate.full}`), {
					[d]: firstChat,
				});

				// set first chat in friend chat list
				await update(ref(db, `users/${id}/chats/receive/${USER_ID}/${opDate.full}`), {
					[d]: firstChat,
				});

				console.log(data.friends);
				data.friends.saved[id] = friendInfo;
				console.log(data.friends);

				// upsh first chat in local
				if (!data.chats.receive[id]) {
					data.chats.receive[id] = {
						[opDate.full]: {
							[d]: firstChat,
						},
					};
				} else {
					data.chats.receive[id][opDate.full] = {
						...data.chats.receive[id][opDate.full],
						[d]: firstChat,
					};
				}

				friendOrNot.classList.add('sbi-user-check');
				uploadProcess.classList.remove('active');
				userAddAndInfo.classList.add('have');
				currentSearchSelection = null;
				userSearchInput.value = '';
				allSearchResult.innerHTML = '';
				setupFriends();
			} catch (error) {
				console.log('something went wrong!!');
				console.log(error);
			}
		}, 700)
	);

	// setup chat friends list
	function setupFriends() {
		if(!data.friends) return;

		const isExsist = (data.friends.saved) || {};
		const friendsLen = Object.keys(data.friends.saved || {}).length;
		if (friendsLen < 1) return;

		// sorted by last message user z
		const sortedFriends = sortObjectByUserId(data.friends.saved);

		let str = '';
		for (let i = 0; i < friendsLen; i++) {
			str += `
       <div class="contact-box">
          <div class="wrap">
             <div class="contact-icon">
                <span>
                   <i class="sbi-user"></i>
                   <img src="" class="contect-img" alt="friend image">
                </span>
             </div>
             <div class="contact-datas">
                <div class="contact-name-time">
                   <div class="contact-name">Contact Name</div>
                   <div class="last-chat-time">00:00</div>
                </div>
                <div class="last-chat-no-of-msg">
                   <div class="last-chat">Last Chat</div>
                   <div class="no-of-msg"><p>100</p></div>
                </div>
             </div>
          </div>
       </div>
     `;
		}
		wrapContacts.innerHTML = str;

		const box = document.querySelectorAll('.contact-box');
		const iconEle = document.querySelectorAll('.contact-icon');
		const image = document.querySelectorAll('.contect-img');
		const contentDtls = document.querySelectorAll('.contact-datas');
		const name = document.querySelectorAll('.contact-name');
		const lastChatTime = document.querySelectorAll('.last-chat-time');
		const lastChat = document.querySelectorAll('.last-chat');
		const noOfMsgEle = document.querySelectorAll('.no-of-msg');
		const noOfMsg = document.querySelectorAll('.no-of-msg p');

		sortedFriends.forEach((friend, i) => {
			if (friend.images.high && friend.images.low) {
				iconEle[i].classList.add('active');
				image[i].src = friend.images.low;
			}

			const oldStatus = friend.onlineStatus;

			if (Date.now() - oldStatus > UPDATE_DELAY - 10000) {
				iconEle[i].classList.add('online');
			}

			name[i].innerText = friend.name ? friend.name : 'Guest';
			lastChatTime[i].innerText = formatTime(friend.lastChatTime);

			let formatMessage = friend.lastMessage;
			let brIndex = formatMessage.indexOf('<br>');

			if (brIndex != -1) {
				formatMessage = formatMessage.substring(0, brIndex) + '...';
			} else if (formatMessage.length > 45) {
				formatMessage = formatMessage.substring(0, 45) + '...';
			}

			lastChat[i].innerText = formatMessage;

			const len = getFriendReceiveMessageLength(friend.id);

			if (len > 0) {
				noOfMsg[i].innerText = len;
				noOfMsgEle[i].classList.add('active');
			}


			iconEle[i].addEventListener('click', () => {
				profileViewBox.classList.add('active');
				profileViewName.innerText = friend.name ? friend.name : 'Guest';
				profileViewIdValue.innerText = friend.id;
				profileViewAboutValue.innerText = friend.about;

				if (friend.images.high) {
					porfileViewSrc.src = friend.images.high;
					profileViewImage.classList.add("active");
				} else {
					profileViewImage.classList.add("active");
				}




			})

			// clidk friend body element
			contentDtls[i].addEventListener('click', async () => {
				const isOnline = iconEle[i].classList.contains('online');

				currentChatOpenId = friend.id;

				// when profile open force to close
				myProfileAndFindUser.classList.remove('show');

				if (friend.images.low) {
					ID('porfile-image').classList.add('active');
					chatProfileImg.src = friend.images.low;
				} else {
					ID('porfile-image').classList.remove('active');
				}
				if (friend.name) {
					ID('pf-name').innerHTML = friend.name;
				}
				if (isOnline) {
					ID('pf-status').classList.add('active');
					ID('pf-status').innerText = 'Online';
				} else {
					ID('pf-status').classList.remove('active');
					ID('pf-status').innerText = formatTime(friend.onlineStatus);
				}

				const allMessages = getAllMessages(friend.id);

				setUpMessages(allMessages);

				document.body.classList.add('active');
				bodyMaxScroll = scrollBox.scrollWidth - scrollBox.clientWidth;
				smoothScroll(scrollBox, 'scrollLeft', bodyMaxScroll, 100);
				noOfMsgEle[i].classList.remove('active');
			});
		});
	}

	let clickOver = false;

	profileView.addEventListener('click', () => {
		clickOver = true;
	});

	profileViewBox.addEventListener("click", () => {
		if (!clickOver) {
			profileViewBox.classList.remove('active');
		}
		clickOver = false;
	})


	const inputDiv = ID('input-div');
	const scrollChatWrap = Q('#scroll-chat .wrap');
	const scrollChat = ID('scroll-chat');
	const sendMsg = ID('send-msg');

	let maxScroll = 0;
	function setUpMessages(messages) {
		scrollChatWrap.innerHTML = '';
		let str = ``;

		messages.forEach((e) => {
			str += getMessages(e);
		});
		scrollChatWrap.innerHTML = str;

		// ------- end of the chat set ------
		maxScroll = scrollChat.scrollHeight - scrollChat.clientHeight;
		scrollChat.scrollTop = maxScroll;
	}

	function getMessages({message, time, type}) {
		return `
            <div class="chat-box ${type || ''}">
                <div class="chat-content">
                    <div class="wrap">
                        <div class="c-text">${message}
                        <p class="c-time" data-time="${time}"></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
	}

	sendMsg.on(async () => {
		const message = messageModify(inputDiv.innerText);
		if (!message.length) {
			return;
		} else {
			try {
				const d = Date.now();
				const opDate = getOptimizeDate();
				const id = currentChatOpenId;
				inputDiv.innerHTML = '';

				if (!data.chats.saved[id][opDate.full]) {
					data.chats.saved[id][opDate.full] = {
						[d]: {
							message: message,
							type: USER_ID,
						},
					};

					scrollChatWrap.innerHTML += getMessages({
						message: getClenderStatus(opDate.full, opDate.full),
						type: 'status',
					});
				} else {
					data.chats.saved[id][opDate.full][d] = {
						message: message,
						type: USER_ID,
					};
				}

				data.friends.saved[id].lastChatTime = d;
				data.friends.saved[id].lastMessage = message;

				ID('msg-lvl').classList.add('active');
				scrollChatWrap.innerHTML += getMessages({
					message: message,
					type: 'me',
					time: formatTime(d),
				});

				maxScroll = scrollChat.scrollHeight - scrollChat.clientHeight;
				scrollChat.scrollTop = maxScroll;

				// set first chat in my chat list
				await update(child(dbRef, `chats/saved/${id}/${opDate.full}`), {
					[d]: {
						message: message,
						type: USER_ID,
					},
				});

				// set first chat in friend chat list
				await update(ref(db, `users/${id}/chats/receive/${USER_ID}/${opDate.full}`), {
					[d]: {
						message: message,
						type: USER_ID,
					},
				});

				setupFriends();
			} catch (error) {
				console.log(error);
			}
		}
	});
};
