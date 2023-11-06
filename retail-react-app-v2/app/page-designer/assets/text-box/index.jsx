/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Box, Image } from '@chakra-ui/react'
import { useProduct } from '@salesforce/commerce-sdk-react'
/**
 * Simple ProductTile component that can be used inside any Layout component.
 * @param image Object containing the image url, _type and focalPoint.
 * @returns {JSX.Element}
 */
export const TextBox = ({ typeId,richText }) => {

    
    const [res, setdata] = useState(null)
    
    useEffect(() => {
        function convertDataToArray(data) {
            // Regular expression pattern to match and capture text content within <p> tags
            var regex = /<p>(.*?)<\/p>/gi;
          
            var dataArray = [];
            var match;
          
            while ((match = regex.exec(data))) {
              var textContent = match[1];
              dataArray.push(textContent);
            }
          
            return dataArray;
          }
          
          // Example data (replace this with your actual data)
          var data = '<p>Frequently Asked Questions</p><p>Expert Service</p><p>Managing My Account</p><p>Subscribe| Unsubscribe</p><p>Contact Us</p><p>Creating My Account</p>';
          
          // Convert the data to an array
          var dataArray = convertDataToArray(data);
          
          // Log the resulting array
          console.log(dataArray);
          
          
          setdata(dataArray)
          
          
        
       
    }, [])
   
    //console.log(res[0].text);
      
     
    return (
        <Box>
            
            <h3 style={{fontWeight:"bold"}}>{res}</h3>
          
        </Box>
    )
}

TextBox.propTypes = {
    content: PropTypes.string
}

export default TextBox
