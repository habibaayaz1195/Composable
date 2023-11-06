// import React from 'react'

// import fetch from 'cross-fetch'

// import { List, ListItem } from '@chakra-ui/react'

// import Link from '../../components/link'

// import { app } from "../../../config/default";

// import { getAppOrigin } from 'pwa-kit-react-sdk/utils/url';




// const ContentSearch = ({contentResult}) => {

//     if (!contentResult) {

//         return <div>Loading...</div>

//     }




//     const {hits = []} = contentResult

//     return (

//         <div>

//             {hits.length ? (

//                 <List>

//                     {hits.map(({id, name}) => (

//                         <Link key={id} to={`/content/${id}`}>

//                             <ListItem>{name}</ListItem>

//                         </Link>

//                     ))}

//                 </List>

//             ) : (

//                 <div>No Content Items Found!</div>

//             )}

//         </div>

//     )

// }





// ContentSearch.getProps = async () => {

//     let contentResult = "abc"

//     //Make a call to the URL substituting Key Values from table

//     const res = await fetch(

//         `${getAppOrigin()}/mobify/proxy/ocapi/s/${app.commerceAPI.parameters.siteId}/dw/shop/v20_2/content_search?q=about&client_id=${app.commerceAPI.parameters.clientId}`
            
//     )

//     if (res.ok) {

//         contentResult = await res.json()
//         console.log("hello")
//     }

//     if (process.env.NODE_ENV !== 'production') {

//         console.log(contentResult)
       
//     }

//     return {contentResult}

// }




// ContentSearch.getTemplateName = () => 'content-search';




// export default ContentSearch

import React, { useState,useEffect } from 'react'
import fetch from 'cross-fetch'
import {List, ListItem} from '@chakra-ui/react'
import Link from '../../components/link'
import { app } from "../../../config/default";

import { getAppOrigin } from 'pwa-kit-react-sdk/utils/url';
const ContentSearch = (props) => {
    app.cre
    const [contentResult, setcontentResult] = useState(null);
    useEffect(() => {
        const getContent =async() => {
            const res = await fetch(
                `${getAppOrigin()}/mobify/proxy/ocapi/s/RefArch/dw/shop/v20_2/content_search?q=about&client_id=78a1847b-0d36-4e48-8005-f2d981d1b318`
            )
            if (res.ok) {
                contentResult = await res.json()
                return contentResult;
            }
            return null;
        }
        //Make a call to the URL substituting Key Values from table
       var contentCall = getContent();
       console.log(contentCall)
       setcontentResult(contentCall)
       
      }, []);
if (!contentResult) {
        console.log("in cr")
        return <div>Loading...
           
        </div>
    }

    const {hits = []} = contentResult
    return (
        <div>
            {hits.length ? (
                <List>
                    {hits.map(({id, name}) => (
                        <Link key={id} to={`/content/${id}`}>
                            <ListItem>{name}</ListItem>
                        </Link>
                    ))}
                </List>
            ) : (
                <div>No Content Items Found!</div>
            )}
        </div>
    )
}
// ContentSearch.getProps = async () => {
//     var URL = `http://localhost:3000/mobify/proxy/ocapi/s/RefArch/dw/shop/v20_2/content_search?q=about&client_id=78a1847b-0d36-4e48-8005-f2d981d1b318`
    
//     let contentResult
//     //Make a call to the URL substituting Key Values from table
//     const res = await fetch(
//         `${getAppOrigin()}/mobify/proxy/ocapi/s/RefArch/dw/shop/v20_2/content_search?q=about&client_id=78a1847b-0d36-4e48-8005-f2d981d1b318`
//     )
//     if (res.ok) {
//         contentResult = await res.json()
//     }
//     if (process.env.NODE_ENV !== 'production') {
//         console.log(contentResult)
//     }
//     return {contentResult, URL}
// }
ContentSearch.getTemplateName = () => 'content-search'

export default ContentSearch