const apiHost = "https://csc346chat.test.apps.uits.arizona.edu"

const imgHost = "https://4x3ulgakvzjykh5asotlp5b6bq0luior.lambda-url.us-east-1.on.aws/"

window.addEventListener("load", () => {
    setup()
    loadChats()
    checkLoginTicket()
})

var chatApi = new ChatAPI()
var sessionStorage = window.sessionStorage
var locationURL = new URL(document.location)
var user = null
var authJWT = null
var newestChatTimestamp = null
var oldestChatTimestamp = null

function setup() {
    if (sessionStorage.getItem("user")) {
        user = sessionStorage.getItem("user")
        authJWT = sessionStorage.getItem("authJWT")
        updateLoginButton(user)
    } else {
        updateLoginButton()
    }

    // Attach a click handler to the new chat button
    const newChatButton = document.getElementById("newchatbutton")
    newChatButton.addEventListener("click", handleNewChat)

    // Attach a click handler to the load older chats button
    const olderChatsButton = document.getElementById("olderchatsbutton")
    olderChatsButton.addEventListener("click", handleOlderChats)

    // Attach the close modal image function to the modal overlay
    const modalElement = document.getElementById("imagemodal")
    modalElement.addEventListener("click", closeModalImage)
}

async function checkUploadImage() {
    // See if we have a file selected in the imageupload element
    const fileElement = document.getElementById("imageupload")
    const files = fileElement.files
    if (!files.length) {
        return await Promise.resolve(undefined)
    }

    const imageFile=files[0]
    var fileName=imageFile.name
    fileName=encodeURIComponent(fileName)
    fileName=fileName.replaceAll('+', '-')
    fileName=fileName.replaceAll('%20','-')

    const generateUploadURL = await fetch(imgHost+"?filename="+fileName).then((response)=> response.json())
    const signedUploadURL=generateUploadURL.upload_url

    const options = {
        method: 'PUT',
        body: imageFile
    }

    const uploadReponse = await fetch(signedUploadURL,
        {
            method: 'PUT',
            body:imageFile
        });

    return generateUploadURL
}


async function checkLoginTicket() {
    let params = locationURL.searchParams

    let service = locationURL.origin + "/"

    if (params.has("ticket")) {
        let ticket = params.get("ticket")
        loginResponse = await chatApi.authenticate(ticket, service)
        handleLogin(loginResponse)
    } else {
        console.log("No Ticket")
    }
}


async function loadChats(startTime=null, endTime=null) {
    var chat_response = null
    if (endTime != null) {
        chat_response = await chatApi.getChatsBefore(endTime)
    } else {
        chat_response = await chatApi.getChat(startTime)
    }

    if (chat_response == undefined) {
        console.error("chat_response not set")
        return
    }

    if (chat_response.status != "OK") {
        console.error(chat_response.message)
        return
    }

    chats = chat_response.messages

    var position = "end"
    if (startTime != null) {
        position = "beginning"
    }

    chats.forEach(chat => {
        makeNewChatElement(chat, position=position)
    });

}

function makeNewChatElement(chat, position="end") {
    if (newestChatTimestamp == null) {
        newestChatTimestamp = chat.timestamp
    } else if (chat.timestamp > newestChatTimestamp) {
        newestChatTimestamp = chat.timestamp
    }

    if (oldestChatTimestamp == null) {
        oldestChatTimestamp = chat.timestamp
    } else if (chat.timestamp < oldestChatTimestamp) {
        oldestChatTimestamp = chat.timestamp
    }

    let container = document.getElementById("chatcontainer")

    let newChat = document.createElement("div")
    newChat.classList.add("list-group-item")

    let chatUsername = document.createElement("small")
    d = new Date(Number(chat.timestamp) * 1000)
    chatUsername.textContent = "@" + chat.username + " (" + d.toLocaleDateString() + " " + d.toLocaleTimeString() + ")"

    let chatMessage = document.createElement("div")
    chatMessage.textContent = chat.message

    if (chat.image_full_url && chat.image_thumbnail_url) {
        
         let chatImageElement=document.createElement("img")
         chatImageElement.src=chat.image_thumbnail_url;
         chatImageElement.classList.add("img-fluid");
         chatImageElement.classList.add("rounded");
         chatImageElement.classList.add("float-right");

        chatImageElement.addEventListener("click", ()=>showModalImage(chat.image_full_url))

        newChat.append(chatImageElement);

    }
    
    newChat.appendChild(chatUsername)
    newChat.appendChild(chatMessage)

    if (position == "end") {
        container.appendChild(newChat)
    } else {
        container.insertBefore(newChat, container.children[0])
    }
}

function handleLogin(loginResponse) {
    window.history.replaceState(null, '', '/')

    user = loginResponse.username
    authJWT = loginResponse.jwt

    // Store the loginResponse in the browser's local storage
    sessionStorage.setItem("user", user)
    sessionStorage.setItem("authJWT", authJWT)

    updateLoginButton(user)
}

function handleLogout() {
    sessionStorage.removeItem("user")
    sessionStorage.removeItem("authJWT")
    user = null
    authJWT = null
    window.location.reload(true)
}

function updateLoginButton(username=null) {
    const loginElement = document.getElementById("userlogin")
    const newChatForm = document.getElementById("newchatcontainer")
    let loginLinkElement = document.createElement("a")
    if (username == null || username == "") {
        let loginURL = apiHost + "/login?service=" + locationURL.origin + locationURL.pathname
        loginLinkElement.href = loginURL
        loginLinkElement.textContent = "Login"

        newChatForm.hidden = true
    } else {

        let loginURL = "#"
        loginLinkElement.href = loginURL
        loginLinkElement.textContent = "Logout: " + username
        loginLinkElement.addEventListener("click", handleLogout)

        // Show the new chat form
        newChatForm.hidden = false
    }

    while (loginElement.firstChild) {
        loginElement.removeChild(loginElement.firstChild)
    }

    loginElement.appendChild(loginLinkElement)
}

async function handleNewChat(event) {
    // Don't submit the form through the default mechanism
    event.preventDefault()

    const imageData = await checkUploadImage()
    const chatTextInputElement = document.getElementById("newchatinput")
    const chatText = chatTextInputElement.value
    
    let newChatResponse = await chatApi.postChat(chatText, imageData)

    if (newChatResponse.status != "OK") {
        console.error(newChatResponse.message)
        return
    }

    // If everything worked, clear out the chat input field
    chatTextInputElement.value = ""

    // Load the new chat
    loadChats(newestChatTimestamp, null)
}

async function handleOlderChats(event) {
    // Don't submit the form through the default mechanism
    event.preventDefault()

    // Load the old chats
    loadChats(null, oldestChatTimestamp)
}

function showModalImage(imgSrc) {
    const modalElement = document.getElementById("imagemodal")
    const imgElement = document.getElementById("imagefullsize")
    imgElement.src = imgSrc
    modalElement.style.display = "block"
}

function closeModalImage() {
    const modalElement = document.getElementById("imagemodal")
    modalElement.style.display = "none"
}
