/*
 * Copyright (c) 2023, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import React from 'react'
import PropTypes from 'prop-types'
import { Box, Image } from '@chakra-ui/react'
import { Region, regionPropType } from '@salesforce/commerce-sdk-react/components'
import { useEffect } from 'react'
import { getAppOrigin } from '@salesforce/pwa-kit-react-sdk/utils/url'
import axios from 'axios'
import { useProduct } from '@salesforce/commerce-sdk-react'
/**
 * Simple ProductTile component that can be used inside any Layout component.
 * @param image Object containing the image url, _type and focalPoint.
 * @returns {JSX.Element}
 */
export const ProductTile = ({ product }) => {

    const {
        data,
        isLoading: isProductLoading,
        isError: isProudctError,
        error: productError
    } = useProduct(
        {
            parameters: {
                id: product,
                allImages: true
            }
        },

        {
            // When shoppers select a different variant (and the app fetches the new data),
            // the old data is still rendered (and not the skeletons).
            keepPreviousData: true
        }
    )
    
     
    if (data == [] || data) {
        var imageURL = data.imageGroups[0].images[0].disBaseLink
        var name = data.name
        var price = data.price
        var id =data.id
    }
    
    return (
        <Box>
            <a href={`${getAppOrigin()}/product/${id}`}>
            <Image src={imageURL}
            
                alt="product Image"
                
                name={name}>
            </Image>
            
            <h3 style={{fontWeight:"bold"}}>{name}</h3></a>
            <h3 style={{fontWeight:"bold"}}>${price}</h3>

        </Box>
    )
}

ProductTile.propTypes = {
    product: PropTypes.string
}

export default ProductTile
