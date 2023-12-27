import * as React from "react"
import { useEffect, useRef } from "react"
import { styled, useTheme } from "@mui/material/styles"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import CssBaseline from "@mui/material/CssBaseline"
import MuiAppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import Divider from "@mui/material/Divider"
import IconButton from "@mui/material/IconButton"
import MenuIcon from "@mui/icons-material/Menu"
import FolderIcon from "@mui/icons-material/Folder"
import TreeView from "@mui/lab/TreeView"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import TreeItem from "@mui/lab/TreeItem"
import PersonIcon from "@mui/icons-material/Person"
import ModeEditIcon from "@mui/icons-material/ModeEdit"
import SendIcon from "@mui/icons-material/Send"
import { TextField } from "@mui/material"
import TextareaAutosize from "@mui/base/TextareaAutosize"

import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

let drawerWidth = 360

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  })
)

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}))

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "left",
}))

const TreeItems = () => {
  const [files, setFiles] = React.useState([])

  useEffect(() => {
    if (window.api) {
      window.api.response("dialog:filelist", (filelist) => {
        console.log("dialog:filelist", filelist)
        setFiles(filelist)
      })
    }
  }, [])

  const tree = (
    <TreeView
      aria-label="file system navigator"
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: "auto" }}>
      {files?.map((file, i) => (
        <TreeItem key={file.name + i} nodeId={file.name + i} label={file.name}>
          {file.children?.map((child, j) => (
            <TreeItem
              sx={{
                "& .MuiTreeItem-label": {
                  fontSize: "12px",
                },
              }}
              key={file.name + child.name + j}
              nodeId={file.name + child.name + j}
              label={child.name}
            />
          ))}
        </TreeItem>
      ))}
    </TreeView>
  )

  return tree
}

const Conversation = () => {
  const [conversation, setConversation] = React.useState([])

  useEffect(() => {
    if (window.api) {
      window.api.response("chat:response", (response) => {
        console.log("chat:response", response)
        if (!conversation.some((x) => x.id === response.id)) {
          setConversation([...conversation, response])
        }
      })
    }
  }, [conversation])

  const exchanges = (
    <div>
      {conversation.map((exchange, index) => (
        <div key={`d-${index}-${exchange.id}`}>
          <div style={{ display: "flex" }} key={`dc-${index}-${exchange.id}`}>
            <LastPrompt key={`lp-${index}-${exchange.id}`} prompt={exchange.prompt} />
          </div>
          <ChatResponse key={`cr-${index}-${exchange.id}`} response={exchange.completion}/>
        </div>
      ))}
      <Prompt />
    </div>
  )

  return exchanges
}

const LastPrompt = (props) => {
  const [allowEdit, setAllowEdit] = React.useState(false)
  const [prompt, setPrompt] = React.useState('')
  const textRef = useRef();

  let textField = ''

  useEffect(() => {
    setPrompt(props.prompt)
  }, [props.prompt])

  const handleChange = (event) => {
    const text = event.target.value
    setPrompt(text)
  }

  const handleKeyDown = (event) => {
    if (!allowEdit) {
      event.preventDefault();
      return
    }

    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      setPrompt(prompt + '\n')
      return
    }

    if (event.key === 'Enter') {
      handleSubmit()
      setAllowEdit(false)
    }
  };


  const handleSubmit = () => {
    window.api.request("chat:completion", prompt)
    toast.info("Processing...")
  }

  const enableEdit = () => {
    setAllowEdit(true)
    setPrompt(textRef.current.value)
    textRef.current.focus()
  }

  const handleBlur = () => {
    setAllowEdit(false)
  }

  if (props.prompt) {
    textField = (
      <>
        <PersonIcon style={{ marginTop: "10px" }} />
        <TextField
          multiline
          inputRef={textRef}
          id="last-prompt"
          variant="outlined"
          sx={{ width: "85%", padding: "5px" }}
          size="small"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          value={prompt}
        />
        {allowEdit ? (
          <IconButton onClick={handleSubmit}>
            <SendIcon />
          </IconButton>
        ) : (
          <IconButton onClick={enableEdit}>
            <ModeEditIcon />
          </IconButton>
        )}
      </>
    )
  }

  return textField
}

const ChatResponse = (props) => {
  const blue = {
    100: "#DAECFF",
    200: "#b6daff",
    400: "#3399FF",
    500: "#007FFF",
    600: "#0072E5",
    900: "#003A75",
  }

  const grey = {
    50: "#f6f8fa",
    100: "#eaeef2",
    200: "#d0d7de",
    300: "#afb8c1",
    400: "#8c959f",
    500: "#6e7781",
    600: "#57606a",
    700: "#424a53",
    800: "#32383f",
    900: "#24292f",
  }

  const StyledTextarea = styled(TextareaAutosize)(
    ({ theme }) => `
    width: 90%;
    font-family: IBM Plex Sans, sans-serif;
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.5;
    padding: 12px;
    border-radius: 12px 12px 0 12px;
    color: ${theme.palette.mode === "dark" ? grey[300] : grey[900]};
    background: ${theme.palette.mode === "dark" ? grey[900] : "#fff"};
    border: 1px solid ${theme.palette.mode === "dark" ? grey[700] : grey[200]};
    box-shadow: 0px 2px 24px ${
      theme.palette.mode === "dark" ? blue[900] : blue[100]
    };

    &:hover {
      border-color: ${blue[400]};
    }

    &:focus {
      border-color: ${blue[400]};
      box-shadow: 0 0 0 3px ${
        theme.palette.mode === "dark" ? blue[600] : blue[200]
      };
    }

    // firefox
    &:focus-visible {
      outline: 0;
    }
  `
  )

  return (
    <StyledTextarea
      aria-label="Response"
      placeholder="Response"
      defaultValue={props.response}
      disabled
    />
  )
}

const Prompt = () => {
  const [prompt, setPrompt] = React.useState('')

  const insertAtCaret = (event, text) => {
    const pos = event.target.selectionStart
    const front = prompt.substring(0, pos)
    const back = prompt.substring(pos, prompt.length)
    setPrompt(front + text + back)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      insertAtCaret(event, '\n')
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit()
    }
  };

  const handleChange = (event) => {
    const text = event.target.value
    setPrompt(text)
  }

  const handleSubmit = () => {
    window.api.request("chat:completion", prompt)
    toast.info("Processing...")
    setPrompt('')
  }

  return (
    <>
      <TextField
        multiline
        id="last-prompt"
        placeholder="Prompt"
        variant="outlined"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        value={prompt}
        sx={{ width: "85%" }}
        size="small"
      />
      <IconButton variant="contained" onClick={handleSubmit} size="large">
        <SendIcon />
      </IconButton>
    </>
  )
}

const SelectedFolder = () => {
  const [path, setPath] = React.useState('')
  const toasting = useRef(false)

  useEffect(() => {
    if (window.api) {
      window.api.request("init:filelist", '')

      window.api.response("init:filelist", () => {
        console.log("init:filelist")
        window.api.request("dialog:openFolder", '')
      })

      window.api.response("dialog:reply", (folderPath) => {
        console.log("dialog:reply", folderPath)
        setPath(folderPath)
        window.curdir = folderPath
      })

      window.api.response("indexing:complete", () => {
        if (!toasting.current) {
          toasting.current = true
          console.log("indexing:complete")
          toast.info("indexing:complete")
        }

        toasting.current = false
      })
    }
  }, [])

  return (
    <>
      <label
        id="folder-lbl"
        style={{
          height: "25px",
          width: "90%",
          backgroundColor: "white",
          color: "black",
          padding: "2px",
          margin: "0",
          overflowY: "hidden",
        }}>
        {path || "Select a content source folder"}
      </label>
      <ToastContainer />
    </>
  )
}

export default function Sidebar() {
  const theme = useTheme()
  const [open, setOpen] = React.useState(false)

  const handleDrawerOpen = () => {
    setOpen(true)
  }

  const handleDrawerClose = () => {
    setOpen(false)
  }

  const handleSelectFolder = () => {
    if (window.api) {
      window.api.request("dialog:openFolder", '')
    }
  }

  useEffect(() => {
    setOpen(true)
  }, [])

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: "none" }) }}>
            <MenuIcon />
          </IconButton>
          <SelectedFolder />
        </Toolbar>
      </AppBar>
      <Drawer
        id="drawer"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}>
        <DrawerHeader>
          <p style={{ marginLeft: "20px" }}>Content Source</p>
          <span style={{ marginLeft: "auto" }}>
            <IconButton onClick={handleSelectFolder}>
              <FolderIcon />
            </IconButton>
            <IconButton onClick={handleDrawerClose}>
              {theme.direction === "ltr" ? (
                <ChevronLeftIcon />
              ) : (
                <ChevronRightIcon />
              )}
            </IconButton>
          </span>
        </DrawerHeader>
        <Divider />
        <TreeItems />
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <Typography paragraph />
        <Conversation />
      </Main>
    </Box>
  )
}
